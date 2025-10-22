import { Bbox, Component, median, XyNode } from './util'

export interface Row {
  blockIds: string[]
}

export interface ColumnLayout {
  xRange: [number, number] // normalized to page width
  rowGroups: Row[]
  blockIdsInColumn: string[]
}

export interface LayoutTree {
  page: { width: number; height: number }
  columns: ColumnLayout[]
  snappedComponents: Component[]
}

export function buildLayoutTree({
  root,
  unitHeight,
  components,
}: {
  root: XyNode
  components: Record<string, Component>
  unitHeight: number
}): LayoutTree {
  const [rx0, ry0, rx1, ry1] = root.region
  const W = rx1 - rx0
  const H = ry1 - ry0

  // defensively clone the components dict since we’ll mutate bboxes on snap
  const dict: Record<string, Component> = {}
  for (const [k, v] of Object.entries(components))
    dict[k] = { ...v, bbox: [...v.bbox] as Bbox }

  // gather leaves → candidate columns
  const leaves = collectLeaves(root)
  const eps = Math.max(0.3 * unitHeight, 0.5) // ~30% of text height, but at least 0.5 px

  // snap per-leaf (column) so edges align cleanly
  for (const leaf of leaves) {
    snapComponentsInColumn(leaf.components, dict, eps)
  }

  // build columns
  const columns: ColumnLayout[] = leaves.map((leaf) => {
    const ordered = orderTopToBottom(leaf.components, dict)
    const xRange = xRangeFor(leaf.components, dict, W)
    return {
      xRange,
      rowGroups: [{ blockIds: ordered }],
      blockIdsInColumn: ordered,
    }
  })

  // left→right by x start
  columns.sort((a, b) => a.xRange[0] - b.xRange[0])

  return {
    page: { width: W, height: H },
    columns,
    snappedComponents: Object.values(dict),
  }
}

function collectLeaves(node: XyNode, out: XyNode[] = []): XyNode[] {
  if (!node.children) {
    out.push(node)
    return out
  }
  collectLeaves(node.children[0], out)
  collectLeaves(node.children[1], out)
  return out
}

function orderTopToBottom(
  ids: string[],
  dict: Record<string, Component>,
): string[] {
  return [...ids].sort((a, b) => {
    const A = dict[a]?.bbox,
      B = dict[b]?.bbox
    if (!A || !B) return 0
    return A[1] - B[1] || A[0] - B[0]
  })
}

function xRangeFor(
  ids: string[],
  dict: Record<string, Component>,
  pageW: number,
): [number, number] {
  let minX = Infinity,
    maxX = -Infinity
  for (const id of ids) {
    const c = dict[id]
    if (!c) continue
    const [x0, , x1] = c.bbox
    if (x0 < minX) minX = x0
    if (x1 > maxX) maxX = x1
  }
  if (!isFinite(minX) || !isFinite(maxX) || pageW <= 0) return [0, 1]
  return [minX / pageW, maxX / pageW]
}

function bucketSnap(
  values: number[],
  eps: number,
): { rep: number; members: number[] }[] {
  const sorted = [...values].sort((a, b) => a - b)
  const buckets: number[][] = []
  for (const v of sorted) {
    let placed = false
    for (const b of buckets) {
      if (Math.abs(b[b.length - 1] - v) <= 2 * eps) {
        b.push(v)
        placed = true
        break
      }
    }
    if (!placed) buckets.push([v])
  }
  return buckets.map((members) => ({ rep: median(members), members }))
}

function snapComponentsInColumn(
  ids: string[],
  dict: Record<string, Component>,
  eps: number,
) {
  if (ids.length === 0) return
  const x0s = ids.map((id) => dict[id].bbox[0])
  const x1s = ids.map((id) => dict[id].bbox[2])
  const y0s = ids.map((id) => dict[id].bbox[1])
  const y1s = ids.map((id) => dict[id].bbox[3])

  const lBuckets = bucketSnap(x0s, eps)
  const rBuckets = bucketSnap(x1s, eps)
  const tBuckets = bucketSnap(y0s, eps)
  const bBuckets = bucketSnap(y1s, eps)

  for (const id of ids) {
    const c = dict[id]
    const [x0, y0, x1, y1] = c.bbox

    const lRep = lBuckets.find((b) =>
      b.members.some((v) => Math.abs(v - x0) <= 2 * eps),
    )?.rep
    const rRep = rBuckets.find((b) =>
      b.members.some((v) => Math.abs(v - x1) <= 2 * eps),
    )?.rep
    const tRep = tBuckets.find((b) =>
      b.members.some((v) => Math.abs(v - y0) <= 2 * eps),
    )?.rep
    const bRep = bBuckets.find((b) =>
      b.members.some((v) => Math.abs(v - y1) <= 2 * eps),
    )?.rep

    let nx0 = x0,
      nx1 = x1,
      ny0 = y0,
      ny1 = y1
    if (typeof lRep === 'number' && Math.abs(lRep - x0) <= eps) nx0 = lRep
    if (typeof rRep === 'number' && Math.abs(rRep - x1) <= eps) nx1 = rRep
    if (typeof tRep === 'number' && Math.abs(tRep - y0) <= eps) ny0 = tRep
    if (typeof bRep === 'number' && Math.abs(bRep - y1) <= eps) ny1 = bRep

    // keep boxes valid
    if (nx1 < nx0) [nx0, nx1] = [nx1, nx0]
    if (ny1 < ny0) [ny0, ny1] = [ny1, ny0]
    dict[id] = { ...c, bbox: [nx0, ny0, nx1, ny1] }
  }
}
