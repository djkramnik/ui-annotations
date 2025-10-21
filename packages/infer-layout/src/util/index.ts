// [x0, y0, x1, y1]
export type Bbox = [number, number, number, number]

export type Interval = [number, number]

export type XyNode = {
  region: Bbox
  components: string[] // string ids
  children?: [XyNode, XyNode]
}

export type Component = {
  id: string
  type: string
  bbox: Bbox
}

const EPS = 1e-6

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

export function intervalOverlap(a: Interval, b: Interval): boolean {
  return Math.min(a[1], b[1]) > Math.max(a[0], b[0]) + EPS
}

// given an array of bounding boxes, get the smallest box that fully encompasses them
export function getRegion(bboxes: Array<Bbox>): Bbox {
  return bboxes.reduce(
    (acc, e) => {
      const [cx0, cy0, cx1, cy1] = acc
      return [
        Math.min(cx0, e[0]),
        Math.min(cy0, e[1]),
        Math.max(cx1, e[2]),
        Math.max(cy1, e[3]),
      ]
    },
    [Infinity, Infinity, 0, 0],
  ) // [x0, y0, x1, y1]
}

export function getHorizontalGutters(
  region: Bbox,
  boxes: Array<Bbox>,
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
  boxes: Array<Bbox>,
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

export function unionIntervals(intervals: Array<Interval>): {
  merged: Array<Interval>
  total: number
} {
  if (intervals.length === 0) return { merged: [], total: 0 }
  const a = [...intervals].sort((x, y) => x[0] - y[0] || x[1] - y[1])
  const merged: Array<Interval> = []
  let [c0, c1] = a[0]
  for (let i = 1; i < a.length; i++) {
    const [u0, u1] = a[i]
    if (u0 <= c1) c1 = Math.max(c1, u1)
    else {
      merged.push([c0, c1])
      c0 = u0
      c1 = u1
    }
  }
  merged.push([c0, c1])
  const total = merged.reduce((s, [u0, u1]) => s + Math.max(0, u1 - u0), 0)
  return { merged, total }
}

export function nearlyEqual(a: number, b: number) {
  return Math.abs(a - b) < EPS
}

export function bestSplit({
  cleanVGutters,
  cleanHGutters,
  region,
  centralityWeight = 0.3,
}: {
  cleanVGutters: Interval[]
  cleanHGutters: Interval[]
  region: Bbox
  centralityWeight?: number
}): { winner: 'vGutter' | 'hGutter'; idx: number } {
  const [rx0, ry0, rx1, ry1] = region
  const EPS = 1e-9
  const W = Math.max(EPS, rx1 - rx0)
  const H = Math.max(EPS, ry1 - ry0)
  const cx = (rx0 + rx1) / 2
  const cy = (ry0 + ry1) / 2

  let winner: 'vGutter' | 'hGutter' | null = null
  let bestIdx = -1
  let bestScore = -Infinity

  const scoreV = (g: Interval) => {
    const [gx0, gx1] = g
    const widthNorm = (gx1 - gx0) / W // larger is better
    const gc = (gx0 + gx1) / 2
    const centrality = Math.abs(gc - cx) / (W / 2) // 0=center, 1=edge
    return widthNorm * (1 - centralityWeight * centrality)
  }

  const scoreH = (g: Interval) => {
    const [gy0, gy1] = g
    const heightNorm = (gy1 - gy0) / H
    const gc = (gy0 + gy1) / 2
    const centrality = Math.abs(gc - cy) / (H / 2)
    return heightNorm * (1 - centralityWeight * centrality)
  }

  // Vertical gutters → X splits
  for (let i = 0; i < cleanVGutters.length; i++) {
    const s = scoreV(cleanVGutters[i])
    if (
      s > bestScore + EPS ||
      (Math.abs(s - bestScore) <= EPS &&
        // tie-breaker 1: larger gutter
        (cleanVGutters[i][1] - cleanVGutters[i][0] >
          (winner === 'vGutter' && bestIdx >= 0
            ? cleanVGutters[bestIdx][1] - cleanVGutters[bestIdx][0]
            : -Infinity) ||
          // tie-breaker 2: closer to center
          (winner !== 'vGutter' && bestIdx < 0)))
    ) {
      bestScore = s
      winner = 'vGutter'
      bestIdx = i
    }
  }

  // Horizontal gutters → Y splits
  for (let i = 0; i < cleanHGutters.length; i++) {
    const s = scoreH(cleanHGutters[i])
    if (
      s > bestScore + EPS ||
      (Math.abs(s - bestScore) <= EPS &&
        cleanHGutters[i][1] - cleanHGutters[i][0] >
          (winner === 'hGutter' && bestIdx >= 0
            ? cleanHGutters[bestIdx][1] - cleanHGutters[bestIdx][0]
            : -Infinity))
    ) {
      bestScore = s
      winner = 'hGutter'
      bestIdx = i
    }
  }

  if (winner == null || bestIdx < 0) {
    throw new Error('bestSplit: no candidate gutters provided')
  }
  return { winner, idx: bestIdx }
}

export function splitOnGutter({
  axis,
  gutter,
  region,
  components,
}: {
  axis: 'X' | 'Y'
  gutter: Interval
  region: Bbox
  components: Component[]
}): [XyNode, XyNode] {
  const [rx0, ry0, rx1, ry1] = region
  const midpoint = (gutter[0] + gutter[1]) / 2
  const [cr0, cr1]: [Bbox, Bbox] =
    axis === 'X'
      ? [
          [rx0, ry0, midpoint, ry1],
          [midpoint, ry0, rx1, ry1],
        ]
      : [
          [rx0, ry0, rx1, midpoint],
          [rx0, midpoint, rx1, ry1],
        ]

  const firstRegionInterval: Interval =
    axis === 'X' ? [cr0[0], cr0[2]] : [cr0[1], cr0[3]]

  const firstNode: XyNode = {
    region: cr0,
    components: [],
  }
  const secondNode: XyNode = {
    region: cr1,
    components: [],
  }

  for (const c of components) {
    const [cx0, cy0, cx1, cy1] = c.bbox
    const cInterval: Interval = axis === 'X' ? [cx0, cx1] : [cy0, cy1]
    if (intervalOverlap(cInterval, firstRegionInterval)) {
      firstNode.components.push(c.id)
    } else {
      secondNode.components.push(c.id)
    }
  }

  return [firstNode, secondNode]
}
