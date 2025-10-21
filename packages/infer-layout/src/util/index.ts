// [x0, y0, x1, y1]
export type Bbox = [number, number, number, number]

export type Interval = [number, number]

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

// given an array of bounding boxes, get the smallest box that fully encompasses them
export function getRegion(bboxes: Array<Bbox>): Bbox {
  return bboxes.reduce((acc, e) => {
    const [cx0, cy0, cx1, cy1] = acc
    return [
      Math.min(cx0, e[0]),
      Math.min(cy0, e[1]),
      Math.max(cx1, e[2]),
      Math.max(cy1, e[3]),
    ]
  }, [Infinity, Infinity, 0, 0]) // [x0, y0, x1, y1]
}

export function getHorizontalGutters(
  region: Bbox,
  boxes: Array<Bbox>
): Array<Interval> {
  const [rx0, ry0, rx1, ry1] = region
  const yIntervals: Array<Interval> = []
  for (const b of boxes) {
    const by0 = Math.max(ry0, b[1])
    const by1 = Math.min(ry1, b[3])
    const bx0 = Math.max(rx0, b[0])
    const bx1 = Math.min(rx1, b[2])
    if (by1 <= by0 || bx1 <= bx0) continue // must intersect region with positive area
    yIntervals.push([by0, by1])
  }
  const { merged } = unionIntervals(yIntervals)
  if (merged.length === 0) return [] // region entirely empty.  no yin without yang
  const gaps: Array<Interval> = []
  let cursor = ry0
  for (const [a0, a1] of merged) {
    if (a0 > cursor) gaps.push([cursor, a0])
    cursor = Math.max(cursor, a1)
  }
  if (cursor < ry1) gaps.push([cursor, ry1])
  return gaps.filter(([a, b]) => b - a > 0)
}

export function getVerticalGutters(
  region: Bbox,
  boxes: Array<Bbox>
): Array<Interval> {
  const [rx0, ry0, rx1, ry1] = region
  const xIntervals: Array<Interval> = []
  for (const b of boxes) {
    const bx0 = Math.max(rx0, b[0])
    const bx1 = Math.min(rx1, b[2])
    const by0 = Math.max(ry0, b[1])
    const by1 = Math.min(ry1, b[3])
    if (bx1 <= bx0 || by1 <= by0) continue
    xIntervals.push([bx0, bx1])
  }
  const { merged } = unionIntervals(xIntervals)
  if (merged.length === 0) return [] // no content equals no gutters
  const gaps: Array<Interval> = []
  let cursor = rx0
  for (const [a0, a1] of merged) {
    if (a0 > cursor) gaps.push([cursor, a0])
    cursor = Math.max(cursor, a1)
  }
  if (cursor < rx1) gaps.push([cursor, rx1])
  return gaps.filter(([a, b]) => b - a > 0)
}

export function unionIntervals(
  intervals: Array<Interval>
): { merged: Array<Interval>; total: number } {
  if (intervals.length === 0) return { merged: [], total: 0 }
  const a = [...intervals].sort((x, y) => x[0] - y[0] || x[1] - y[1])
  const merged: Array<Interval> = []
  let [c0, c1] = a[0]
  for (let i = 1; i < a.length; i++) {
    const [u0, u1] = a[i]
    if (u0 <= c1) c1 = Math.max(c1, u1)
    else { merged.push([c0, c1]); c0 = u0; c1 = u1 }
  }
  merged.push([c0, c1])
  const total = merged.reduce((s, [u0, u1]) => s + Math.max(0, u1 - u0), 0)
  return { merged, total }
}