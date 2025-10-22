import sharp from 'sharp'

type Rect = { x: number; y: number; width: number; height: number }

type TightenOpts = {
  sampleBorder?: number
  bgTolerance?: number
  bgShare?: number
  minEdgeRun?: number
}

/**
 * base64Image: raw base64, no data url
 * rect: initial bounding box on the full screenshot
 */
export async function tightenBoundingBoxes({
  b64,
  annotations,
  opts = {},
  vw,
  vh,
}: {
  b64: string
  annotations: Rect[]
  opts?: TightenOpts
  vw: number
  vh: number
}): Promise<Rect[]> {
  const buf = Buffer.from(b64, 'base64')
  const base = sharp(buf).rotate().ensureAlpha()
  const { width: imgW = 0, height: imgH = 0 } = await base.metadata()
  const sx = imgW / vw,
    sy = imgH / vh

  const clamp = (r: Rect): Rect => {
    const x = Math.max(0, Math.min(imgW - 1, r.x))
    const y = Math.max(0, Math.min(imgH - 1, r.y))
    const w = Math.max(1, Math.min(imgW - x, r.width))
    const h = Math.max(1, Math.min(imgH - y, r.height))
    return { x, y, width: w, height: h }
  }

  const jobs = annotations.map(async (rect) => {
    const imgRect = clamp({
      x: Math.round(rect.x * sx),
      y: Math.round(rect.y * sy),
      width: Math.round(rect.width * sx),
      height: Math.round(rect.height * sy),
    })

    const crop = base.clone().extract({
      left: imgRect.x,
      top: imgRect.y,
      width: imgRect.width,
      height: imgRect.height,
    })

    const { data, info } = await crop
      .raw()
      .toBuffer({ resolveWithObject: true })
    const tight = tightenOnRaw(data, info.width, info.height, opts)

    // if all-bg detected, fall back to original imgRect
    const w = Math.max(1, tight.width),
      h = Math.max(1, tight.height)
    const mapped = clamp({
      x: imgRect.x + tight.x,
      y: imgRect.y + tight.y,
      width: w,
      height: h,
    })
    return mapped
  })

  return Promise.all(jobs)
}

export async function getExtract({
  rect,
  buf,
}: {
  rect: Rect
  buf: Buffer
}): Promise<string> {
  return (
    await sharp(buf)
      .extract({
        left: rect.x,
        top: rect.y,
        ...rect,
      })
      .png()
      .toBuffer()
  ).toString('base64')
}

export function scaleRect({
  rect,
  sx,
  sy,
  imgW,
  imgH,
}: {
  rect: Rect
  sx: number
  sy: number
  imgW: number
  imgH: number
}): Rect {
  const { x, y, width, height } = rect
  let ix = Math.round(x * sx)
  let iy = Math.round(y * sy)
  let iw = Math.round(width * sx)
  let ih = Math.round(height * sy)

  // Clamp to image bounds (avoids errors if rect spills out)
  ix = Math.max(0, Math.min(ix, imgW - 1))
  iy = Math.max(0, Math.min(iy, imgH - 1))
  iw = Math.max(0, Math.min(iw, imgW - ix))
  ih = Math.max(0, Math.min(ih, imgH - iy))
  return {
    x: ix,
    y: iy,
    width: iw,
    height: ih,
  }
}

// where original is the original full sized rect and candidate is a potential 'tightening up' of the original
export function boxesSimilar(original: Rect, candidate: Rect, opts?: Partial<{
  maxAspectDrift: number
  minAreaFrac: number
  maxAreaFrac: number
}>): boolean {
  const maxAspectDrift = opts?.maxAspectDrift ?? 0.5;
  const minAreaFrac = opts?.minAreaFrac ?? 0.25;
  const maxAreaFrac = opts?.maxAreaFrac ?? 1.25;

  const aspect = (r: Rect) => r.width / Math.max(1, r.height);
  const area = (r: Rect) => r.width * r.height;

  const aspectDrift = Math.abs(aspect(candidate)/aspect(original) - 1);
  const areaRatio = area(candidate)/Math.max(1, area(original));
  return aspectDrift <= maxAspectDrift && areaRatio >= minAreaFrac && areaRatio <= maxAreaFrac;
}

function rgb2lab(r: number, g: number, b: number): [number, number, number] {
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
function dE(a: [number, number, number], b: [number, number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function huberMean(
  labs: [number, number, number][],
  k = 3,
  delta = 5,
): [number, number, number] {
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
