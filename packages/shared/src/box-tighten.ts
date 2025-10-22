import sharp from 'sharp'

type Rect = { x: number; y: number; width: number; height: number }

type TightenOpts = {
  sampleBorder?: number
  bgTolerance?: number
  bgShare?: number
  minEdgeRun?: number
  writeCroppedToPath?: string
}

const rgb2lab = (r: number, g: number, b: number): [number, number, number] => {
  const s2l = (u: number) => {
    u /= 255
    return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)
  }
  const R = s2l(r),
    G = s2l(g),
    B = s2l(b)
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041
  const xn = 0.95047,
    yn = 1.0,
    zn = 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(X / xn),
    fy = f(Y / yn),
    fz = f(Z / zn)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}
const dE = (a: [number, number, number], b: [number, number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

const huberMean = (
  labs: [number, number, number][],
  k = 3,
  delta = 5,
): [number, number, number] => {
  let m: [number, number, number] = labs.reduce(
    (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
    [0, 0, 0],
  )
  m = [m[0] / labs.length, m[1] / labs.length, m[2] / labs.length]
  for (let i = 0; i < k; i++) {
    let wsum = 0,
      L = 0,
      a = 0,
      b = 0
    for (const v of labs) {
      const e = dE(v, m)
      const w = e <= delta ? 1 : delta / e
      wsum += w
      L += w * v[0]
      a += w * v[1]
      b += w * v[2]
    }
    m = [L / wsum, a / wsum, b / wsum]
  }
  return m
}

function tightenOnRaw(
  data: Buffer,
  W: number,
  H: number,
  opts: TightenOpts = {},
): Rect {
  const sampleBorder = opts.sampleBorder ?? 2
  const tol = opts.bgTolerance ?? 8
  const bgShare = opts.bgShare ?? 0.9
  const minEdgeRun = opts.minEdgeRun ?? 2

  const pxLab = (i: number) => rgb2lab(data[i], data[i + 1], data[i + 2])
  const labs: [number, number, number][] = []
  const push = (i: number) => labs.push(pxLab(i))

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < sampleBorder; x++) push((y * W + x) * 4)
    for (let x = Math.max(W - sampleBorder, 0); x < W; x++)
      push((y * W + x) * 4)
  }
  for (let x = sampleBorder; x < Math.max(W - sampleBorder, 0); x++) {
    for (let y = 0; y < sampleBorder; y++) push((y * W + x) * 4)
    for (let y = Math.max(H - sampleBorder, 0); y < H; y++)
      push((y * W + x) * 4)
  }
  const bg = huberMean(labs)

  const lineBgShare = (vertical: boolean, idx: number) => {
    let bgCount = 0,
      total = vertical ? H : W
    if (vertical) {
      for (let y = 0; y < H; y++) {
        const i = (y * W + idx) * 4
        if (dE(pxLab(i), bg) <= tol) bgCount++
      }
    } else {
      for (let x = 0; x < W; x++) {
        const i = (idx * W + x) * 4
        if (dE(pxLab(i), bg) <= tol) bgCount++
      }
    }
    return bgCount / total
  }

  const scanIn = (vertical: boolean, fromStart: boolean) => {
    const N = vertical ? W : H
    let i = fromStart ? 0 : N - 1
    let run = 0
    while (i >= 0 && i < N) {
      const s = lineBgShare(vertical, i)
      if (s >= bgShare) {
        run++
        i += fromStart ? 1 : -1
      } else if (run >= minEdgeRun) return fromStart ? i : i + 1
      else {
        run = 0
        i += fromStart ? 1 : -1
      }
    }
    return fromStart ? N : 0
  }

  const left = Math.min(scanIn(true, true), W - 1)
  const right = Math.max(scanIn(true, false), 0)
  const top = Math.min(scanIn(false, true), H - 1)
  const bottom = Math.max(scanIn(false, false), 0)

  const x = Math.max(0, left)
  const y = Math.max(0, top)
  const w = Math.max(0, right - x)
  const h = Math.max(0, bottom - y)
  return { x, y, width: w, height: h }
}

/**
 * base64Image: raw base64, no data url
 * rect: initial bounding box on the full screenshot
 */
export async function tightenBoundingBoxOnBase64({
  b64,
  rect,
  opts = {},
  vw,
  vh
}: {
  b64: string
  rect: Rect
  opts?: TightenOpts
  vw: number
  vh: number
}){
  const buf = Buffer.from(b64, 'base64');
  const img = sharp(buf).rotate().ensureAlpha();              // honor EXIF
  const meta = await img.metadata();                          // true dims
  const imgW = meta.width!, imgH = meta.height!;
  const sx = imgW / vw, sy = imgH / vh;

  // map viewer rect -> image-space rect
  const imgRect: Rect = {
    x: Math.round(rect.x * sx),
    y: Math.round(rect.y * sy),
    width: Math.round(rect.width * sx),
    height: Math.round(rect.height * sy),
  };

  const cropSharp = img.extract({
    left: Math.max(0, imgRect.x),
    top: Math.max(0, imgRect.y),
    width: Math.max(1, imgRect.width),
    height: Math.max(1, imgRect.height),
  });

  const { data, info } = await cropSharp.raw().toBuffer({ resolveWithObject: true });
  const tight = tightenOnRaw(data, info.width, info.height, opts);

  if (opts.writeCroppedToPath) {
    await cropSharp.extract({ left: tight.x, top: tight.y, width: tight.width, height: tight.height })
                  .toFile(opts.writeCroppedToPath);
  }

  // map tightened crop back to full-image coords (already image-space)
  const mapped: Rect = {
    x: imgRect.x + tight.x,
    y: imgRect.y + tight.y,
    width: tight.width,
    height: tight.height,
  };
  return { tightRect: mapped, outputPath: opts.writeCroppedToPath };
}
