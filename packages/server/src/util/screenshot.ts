import sharp from 'sharp'

type Rect = { x: number; y: number; width: number; height: number }

export type TightenOpts = {
  sampleBorder?: number;   // px sampled on each edge
  bgTolerance?: number;    // deltaE threshold
  bgShare?: number;        // fraction to treat line as background
  minEdgeRun?: number;     // consecutive bg lines to confirm edge
  fgShareMin?: number;     // ≥ this fraction non-bg => foreground line
  fgRunMin?: number;       // ≥ this many contiguous non-bg px => foreground line
  smoothWin?: number;      // median window on line stats (odd)
};

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
  annotations: {id: string, rect: Rect}[]
  opts?: TightenOpts
  vw: number
  vh: number
}): Promise<{ id: string, rect: Rect }[]> {
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

  const jobs = annotations.map(async (a) => {
    const { id, rect } = a
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
    return {
      id,
      rect: mapped
    }
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
}>): {
  ok: boolean
  aspectDrift: number
  areaRatio: number
  original: Rect
  candidate: Rect
} {
  const maxAspectDrift = opts?.maxAspectDrift ?? 0.5;
  const minAreaFrac = opts?.minAreaFrac ?? 0.25;
  const maxAreaFrac = opts?.maxAreaFrac ?? 1.25;

  const aspect = (r: Rect) => r.width / Math.max(1, r.height);
  const area = (r: Rect) => r.width * r.height;

  const aspectDrift = Math.abs(aspect(candidate)/aspect(original) - 1);
  const areaRatio = area(candidate)/Math.max(1, area(original));
  return {
    ok: aspectDrift <= maxAspectDrift && areaRatio >= minAreaFrac && areaRatio <= maxAreaFrac,
    areaRatio,
    aspectDrift,
    original,
    candidate
  }
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

function bgFromMode(labs: [number,number,number][], q=12){
  const key = (L:number,a:number,b:number)=>`${Math.round(L/q)},${Math.round(a/q)},${Math.round(b/q)}`;
  const map = new Map<string,{s:[number,number,number],n:number}>();
  for (const v of labs){ const k=key(v[0],v[1],v[2]); const b=map.get(k)||{s:[0,0,0],n:0}; b.s[0]+=v[0]; b.s[1]+=v[1]; b.s[2]+=v[2]; b.n++; map.set(k,b); }
  let bg:[number,number,number]=[0,0,0], best=0;
  for (const {s,n} of map.values()) if (n>best){ best=n; bg=[s[0]/n,s[1]/n,s[2]/n]; }
  return bg;
}

function tightenOnRaw(
  data: Buffer,
  W: number,
  H: number,
  opts: TightenOpts = {},
): Rect {
  const sampleBorder = opts.sampleBorder ?? 2;
  const tol = opts.bgTolerance ?? 8;
  const minEdgeRun = opts.minEdgeRun ?? 2;
  const fgShareMin = opts.fgShareMin ?? 0.03;
  const fgRunMin = opts.fgRunMin ?? 3;
  const smoothWin = Math.max(1, opts.smoothWin ?? 3);
  const half = Math.floor(smoothWin / 2);

  const pxLab = (i: number) => rgb2lab(data[i], data[i + 1], data[i + 2]);

  // --- estimate background from border pixels (robust mean in Lab) ---
  const labs: [number, number, number][] = [];
  const push = (i: number) => labs.push(pxLab(i));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < sampleBorder; x++) push((y * W + x) * 4);
    for (let x = Math.max(W - sampleBorder, 0); x < W; x++) push((y * W + x) * 4);
  }
  for (let x = sampleBorder; x < Math.max(W - sampleBorder, 0); x++) {
    for (let y = 0; y < sampleBorder; y++) push((y * W + x) * 4);
    for (let y = Math.max(H - sampleBorder, 0); y < H; y++) push((y * W + x) * 4);
  }
  // const bg = huberMean(labs);
  const bg = bgFromMode(labs)

  // --- per-line stats: non-background fraction and longest contiguous run ---
  const scanLineStats = (vertical: boolean, idx: number) => {
    let nonBg = 0, maxRun = 0, run = 0;
    const N = vertical ? H : W;
    for (let t = 0; t < N; t++) {
      const off = vertical ? (t * W + idx) * 4 : (idx * W + t) * 4;
      const non = dE(pxLab(off), bg) > tol;
      if (non) { nonBg++; run++; if (run > maxRun) maxRun = run; }
      else run = 0;
    }
    return { nonFrac: nonBg / N, maxRun };
  };

  // --- foreground decision with small median smoothing over neighboring lines ---
  const isForegroundLine = (vertical: boolean, idx: number) => {
    const N = vertical ? W : H;
    const stats: { nonFrac: number; maxRun: number }[] = [];
    for (let k = -half; k <= half; k++) {
      const j = Math.min(Math.max(idx + k, 0), N - 1);
      stats.push(scanLineStats(vertical, j));
    }
    const sortedFrac = stats.map(s => s.nonFrac).sort((a, b) => a - b);
    const nonFrac = sortedFrac[Math.floor(sortedFrac.length / 2)];
    const maxRun = Math.max(...stats.map(s => s.maxRun));
    return nonFrac >= fgShareMin || maxRun >= fgRunMin;
  };

  // --- scan inward from each side; require a run of background lines before edge locks ---
  const scanIn = (vertical: boolean, fromStart: boolean) => {
    const N = vertical ? W : H;
    let i = fromStart ? 0 : N - 1;
    let bgRun = 0;
    while (i >= 0 && i < N) {
      const fg = isForegroundLine(vertical, i);
      if (!fg) { bgRun++; i += fromStart ? 1 : -1; }
      else if (bgRun >= minEdgeRun) return fromStart ? i : i + 1;
      else { bgRun = 0; i += fromStart ? 1 : -1; }
    }
    return fromStart ? N : 0; // all background
  };

  const left = Math.min(scanIn(true, true), W - 1);
  const right = Math.max(scanIn(true, false), 0);
  const top = Math.min(scanIn(false, true), H - 1);
  const bottom = Math.max(scanIn(false, false), 0);

  const x = Math.max(0, left);
  const y = Math.max(0, top);
  const w = Math.max(0, right - x);
  const h = Math.max(0, bottom - y);
  return { x, y, width: w, height: h };
}

