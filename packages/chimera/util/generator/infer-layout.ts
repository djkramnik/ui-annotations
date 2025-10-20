/** layout_inference.ts
 *  Infers columns, rows, and relations from noisy element boxes.
 *  No external deps. Drop-in TS.
 */

import { ServiceManualLabel } from 'ui-labelling-shared'

///////////////////////
// Types & Interfaces
///////////////////////

export type BBox = [number, number, number, number] // [x0,y0,x1,y1] in page units (points or px)

export interface ElementInput {
  id: string
  type: ServiceManualLabel
  bbox: BBox // in page coordinates
}

export interface PageInfo {
  width: number // page width in same units as bbox (e.g., points or px)
  height: number // page height
}

export interface NormElement extends ElementInput {
  // normalized to [0,1] coordinate space
  nx0: number
  ny0: number
  nx1: number
  ny1: number
  cx: number
  cy: number // centers (normalized)
  w: number
  h: number // width/height (normalized)
}

export interface Row {
  blockIds: string[] // ordered top→bottom within the row scan
}

export interface ColumnLayout {
  xRange: [number, number] // normalized [x0,x1]
  rowGroups: Row[]
  blockIdsInColumn: string[] // convenience (ordered by y0)
}

export type RelationType = 'captionOf' | 'asideOf'
export interface Relation {
  type: RelationType
  fromId: string
  toId: string
}

export interface LayoutTree {
  page: { width: number; height: number; aspect: number }
  columns: ColumnLayout[]
  relations: Relation[]
  unit: number // the inferred base unit (median text height, normalized)
  snappedElements: NormElement[]
}

///////////////////////
// Utility functions
///////////////////////

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function median(v: number[]): number {
  if (v.length === 0) return 0
  const a = [...v].sort((x, y) => x - y)
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : 0.5 * (a[mid - 1] + a[mid])
}

function iqrClip(values: number[], lowQ = 0.1, highQ = 0.9): number[] {
  if (values.length === 0) return values
  const a = [...values].sort((x, y) => x - y)
  const q = (p: number) => {
    const i = (a.length - 1) * p
    const i0 = Math.floor(i),
      i1 = Math.ceil(i)
    return i0 === i1 ? a[i0] : a[i0] + (a[i1] - a[i0]) * (i - i0)
  }
  const lo = q(lowQ),
    hi = q(highQ)
  return a.filter((x) => x >= lo && x <= hi)
}

function overlap1D(a0: number, a1: number, b0: number, b1: number): number {
  const left = Math.max(a0, b0)
  const right = Math.min(a1, b1)
  return Math.max(0, right - left)
}

function rangeUnion(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): [number, number] {
  return [Math.min(a0, b0), Math.max(a1, b1)]
}

function nearlyEqual(a: number, b: number, eps: number) {
  return Math.abs(a - b) <= eps
}

///////////////////////
// Core Steps
///////////////////////

/** 1) Normalize coordinates to [0,1] and derive features */
export function normalize(
  elements: ElementInput[],
  page: PageInfo,
): NormElement[] {
  const { width: W, height: H } = page
  return elements.map((e) => {
    const [x0, y0, x1, y1] = e.bbox
    const nx0 = clamp01(x0 / W),
      nx1 = clamp01(x1 / W)
    const ny0 = clamp01(y0 / H),
      ny1 = clamp01(y1 / H)
    const w = Math.max(0, nx1 - nx0)
    const h = Math.max(0, ny1 - ny0)
    return {
      ...e,
      nx0,
      ny0,
      nx1,
      ny1,
      w,
      h,
      cx: w > 0 ? (nx0 + nx1) / 2 : nx0,
      cy: h > 0 ? (ny0 + ny1) / 2 : ny0,
    }
  })
}

function isTextLike(t: ServiceManualLabel) {
  return [
    ServiceManualLabel.text_block,
    ServiceManualLabel.heading,
    ServiceManualLabel.bulletpoint,
    ServiceManualLabel.page_num,
    ServiceManualLabel.image_id
  ].includes(t)
}

function isImageLike(t: ServiceManualLabel) {
  return [
    ServiceManualLabel.diagram,
    ServiceManualLabel.image,
    ServiceManualLabel.form
  ].includes(t)
}

/** 2) Estimate the base unit `u` = median text height (normalized) */
function estimateUnit(elems: NormElement[]): number {
  // filter by specifically the helper text_unit label.  falls back to every element
  const heights = elems.filter((e) => e.type === ServiceManualLabel.text_unit).map((e) => e.h)
  const pool = heights.length ? heights : elems.map((e) => e.h) // fallback to all
  const clipped = iqrClip(pool)
  const u = median(clipped)
  // clamp to a sane range
  return Math.max(0.0025, Math.min(u, 0.08))
}

/** 3) Merge micro fragments (e.g., split lines of the same paragraph) */
function mergeMicroFragments(
  elems: NormElement[],
  u: number,
): NormElement[] {
  // Simple O(n log n) sweep by y, then attempt merges with neighbors.
  const sorted = [...elems].sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0)
  const used = new Set<string>()
  const out: NormElement[] = []

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    if (used.has(a.id) || !isTextLike(a.type)) {
      if (!used.has(a.id)) out.push(a)
      continue
    }

    let merged = { ...a }
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]
      if (used.has(b.id) || !isTextLike(b.type)) continue
      // require decent horizontal overlap and tiny vertical gap or slight overlap
      const xOverlap = overlap1D(merged.nx0, merged.nx1, b.nx0, b.nx1)
      const minW = Math.max(1e-6, Math.min(merged.w, b.w))
      const xOverlapRatio = xOverlap / minW
      const vGap = b.ny0 - merged.ny1
      const yOverlap = overlap1D(merged.ny0, merged.ny1, b.ny0, b.ny1)
      const yOverlapRatio = yOverlap / Math.max(1e-6, Math.min(merged.h, b.h))

      const closeHoriz = xOverlapRatio > 0.8
      const smallVGap = vGap >= 0 && vGap < 0.25 * u
      const slightOverlap = yOverlapRatio > 0.05
      if (closeHoriz && (smallVGap || slightOverlap)) {
        // merge b into merged
        const nx0 = Math.min(merged.nx0, b.nx0)
        const ny0 = Math.min(merged.ny0, b.ny0)
        const nx1 = Math.max(merged.nx1, b.nx1)
        const ny1 = Math.max(merged.ny1, b.ny1)
        merged = {
          ...merged,
          nx0,
          ny0,
          nx1,
          ny1,
          w: nx1 - nx0,
          h: ny1 - ny0,
          cx: (nx0 + nx1) / 2,
          cy: (ny0 + ny1) / 2,
          id: merged.id, // keep original id; you could concatenate if you need provenance
        }
        used.add(b.id)
      }
    }
    out.push(merged)
    used.add(merged.id)
  }

  // Re-normalize ordering
  return out.sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0)
}

/** Helper to compute x-range for a set of elements */
function columnXRange(blocks: NormElement[]): [number, number] {
  let x0 = Infinity,
    x1 = -Infinity
  for (const b of blocks) {
    x0 = Math.min(x0, b.nx0)
    x1 = Math.max(x1, b.nx1)
  }
  if (!isFinite(x0) || !isFinite(x1)) return [0, 1]
  return [x0, x1]
}

/** 4) Column detection by clustering element x-centers with a distance threshold. */
function clusterColumns(
  elems: NormElement[],
  cxGapThreshold = 0.08,
): number[][] {
  if (elems.length === 0) return []

  // Sort by x-center
  const sorted = [...elems].sort((a, b) => a.cx - b.cx)
  const clusters: number[][] = []
  let current: number[] = [0]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    const gap = Math.abs(cur.cx - prev.cx)
    if (gap > cxGapThreshold) {
      clusters.push(current)
      current = [i]
    } else {
      current.push(i)
    }
  }
  clusters.push(current)

  // post-merge clusters with heavy x-range overlap
  const resolved: number[][] = []

  for (const idxs of clusters) {
    const blocks = idxs.map((i) => sorted[i])
    const [x0a, x1a] = columnXRange(blocks)

    let merged = false
    for (let k = 0; k < resolved.length; k++) {
      const existingBlocks = resolved[k].map((i) => sorted[i])
      const [x0b, x1b] = columnXRange(existingBlocks)
      const overlap = overlap1D(x0a, x1a, x0b, x1b)
      const denom = Math.min(x1a - x0a, x1b - x0b, 1e9)
      const overlapRatio = denom > 0 ? overlap / denom : 0
      if (overlapRatio > 0.4) {
        resolved[k] = resolved[k].concat(idxs)
        merged = true
        break
      }
    }
    if (!merged) resolved.push(idxs)
  }

  // Sort elements within each cluster by y0 (reading order)
  for (const c of resolved) {
    c.sort(
      (i, j) => sorted[i].ny0 - sorted[j].ny0 || sorted[i].nx0 - sorted[j].nx0,
    )
  }

  // Return clusters as indices into the ORIGINAL `elems` array order
  // We need to map sorted indices back to the original.
  const idToIndex = new Map<string, number>()
  elems.forEach((e, idx) => idToIndex.set(e.id, idx))
  return resolved.map((clusterIdxs) =>
    clusterIdxs
      .map((i) => idToIndex.get(sorted[i].id)!)
      .filter((i) => i !== undefined),
  )
}

/** 5) Row grouping within a column by vertical gap + y-overlap heuristics */
function groupRowsInColumn(blocks: NormElement[], u: number): Row[] {
  if (blocks.length === 0) return []
  const sorted = [...blocks].sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0)

  // Estimate a flexible gap threshold from local gaps
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(Math.max(0, sorted[i].ny0 - sorted[i - 1].ny1))
  }
  const baseGap = median(iqrClip(gaps))
  const gapThreshold = Math.max(1.5 * u, (baseGap || 0) * 1.2)

  const rows: Row[] = []
  let current: string[] = [sorted[0].id]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    const vgap = Math.max(0, cur.ny0 - prev.ny1)
    const yOv = overlap1D(prev.ny0, prev.ny1, cur.ny0, cur.ny1)
    const yOvRatio = yOv / Math.max(1e-6, Math.min(prev.h, cur.h))

    const sameRow = vgap <= gapThreshold || yOvRatio > 0.1
    if (sameRow) {
      current.push(cur.id)
    } else {
      rows.push({ blockIds: current })
      current = [cur.id]
    }
  }
  if (current.length) rows.push({ blockIds: current })
  return rows
}

/** 8) Edge snapping within a column to reduce jitter (softly align left/right edges) */
export function snapEdges(
  columns: ColumnLayout[],
  idToElem: Map<string, NormElement>,
  epsilon: number,
) {
  for (const col of columns) {
    const ids = col.blockIdsInColumn
    if (ids.length === 0) continue

    // collect candidate left/right edges
    const lefts = ids.map((id) => idToElem.get(id)!.nx0)
    const rights = ids.map((id) => idToElem.get(id)!.nx1)

    const snap = (vals: number[]) => {
      // bucket edges into modes within epsilon*2 window
      const buckets: number[][] = []
      for (const v of vals.sort((a, b) => a - b)) {
        let placed = false
        for (const b of buckets) {
          if (Math.abs(b[b.length - 1] - v) <= 2 * epsilon) {
            b.push(v)
            placed = true
            break
          }
        }
        if (!placed) buckets.push([v])
      }
      // representative is median of each bucket
      return buckets.map((b) => ({ rep: median(b), members: b }))
    }

    const lBuckets = snap(lefts)
    const rBuckets = snap(rights)

    // apply snapping
    for (const id of ids) {
      const e = idToElem.get(id)!
      const lRep = lBuckets.find((b) =>
        b.members.some((v) => nearlyEqual(v, e.nx0, 2 * epsilon)),
      )?.rep
      const rRep = rBuckets.find((b) =>
        b.members.some((v) => nearlyEqual(v, e.nx1, 2 * epsilon)),
      )?.rep
      if (typeof lRep === 'number' && Math.abs(lRep - e.nx0) <= epsilon) {
        e.nx0 = lRep
        e.w = e.nx1 - e.nx0
        e.cx = (e.nx0 + e.nx1) / 2
      }
      if (typeof rRep === 'number' && Math.abs(rRep - e.nx1) <= epsilon) {
        e.nx1 = rRep
        e.w = e.nx1 - e.nx0
        e.cx = (e.nx0 + e.nx1) / 2
      }
    }
  }
}

/** 9) Build the final layout tree */
export function buildLayoutTree(
  elems: NormElement[],
  page: PageInfo,
  cxGapThreshold = 0.08,
): LayoutTree {
  const u = estimateUnit(elems)

  // Optionally merge micro-fragments first.  remove the unit helper element(s)
  // const merged = mergeMicroFragments(
  //   elems.filter(e => e.type !== ServiceManualLabel.text_unit), u)

  // not merging.. the current logic is not really desirable but we might investigate later
  const merged = elems.filter(e => e.type !== ServiceManualLabel.text_unit)

  // Cluster columns (returns arrays of indices into `merged`)
  const clusters = clusterColumns(merged, cxGapThreshold)

  // Construct columns
  const idToElem = new Map<string, NormElement>()
  merged.forEach((e) => idToElem.set(e.id, e))

  const columns: ColumnLayout[] = clusters.map((idxArr) => {
    const blocks = idxArr.map((i) => merged[i])
    const xR = columnXRange(blocks)
    const ordered = [...blocks].sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0)
    const rows = groupRowsInColumn(ordered, u)
    return {
      xRange: xR,
      rowGroups: rows,
      blockIdsInColumn: ordered.map((b) => b.id),
    }
  })

  // Sort columns left → right
  columns.sort((a, b) => a.xRange[0] - b.xRange[0])

  // Detect relations? nyet

  // Snap edges to reduce jitter
  snapEdges(columns, idToElem, 0.3 * u)

  const aspect = page.width / Math.max(1e-6, page.height)
  return {
    page: { width: page.width, height: page.height, aspect },
    columns,
    relations: [],
    // relations: [...captionRels, ...asideRels],
    unit: u,
    snappedElements: idToElem.values().toArray()
  }
}

// Integrated buildLayoutTree that uses xyCutColumns for column detection
export function buildLayoutTreeDeux(
  elems: NormElement[],
  page: PageInfo,
  xyOpts?: {
    bins?: number
    valleyTau?: number
    minGutterFrac?: number
    minRegionWidth?: number
    spanFrac?: number
    separatorLabels?: ServiceManualLabel[]
  }
): LayoutTree {
  const u = estimateUnit(elems)

  // drop unit helpers from layout consideration
  const working = elems.filter(e => e.type !== ServiceManualLabel.text_unit)

  // XY-cut over the working set; clusters are indices into `working`
  const clusters = xycut2d(working, { bins: 96, tau: 0.035, minValleyFrac: 0.01, minRegionHeight: 0.01 }, page)
  console.log('le special clusters', clusters)
  // map id → element for snapping & emission
  const idToElem = new Map<string, NormElement>()
  working.forEach((e) => idToElem.set(e.id, e))

  // helper: x-range of blocks
  const columnXRange = (blocks: NormElement[]): [number, number] => {
    let x0 = Infinity, x1 = -Infinity
    for (const b of blocks) { x0 = Math.min(x0, b.nx0); x1 = Math.max(x1, b.nx1) }
    return (!isFinite(x0) || !isFinite(x1)) ? [0, 1] : [x0, x1]
  }

  // build columns from clusters
  const columns: ColumnLayout[] = clusters.map((idxArr) => {
    const blocks = idxArr.map(i => working[i])
    const xR = columnXRange(blocks)
    const ordered = [...blocks].sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0)
    const rows = groupRowsInColumn(ordered, u)
    return {
      xRange: xR,
      rowGroups: rows,
      blockIdsInColumn: ordered.map(b => b.id),
    }
  })

  // left→right column order
  columns.sort((a, b) => a.xRange[0] - b.xRange[0])

  // snap edges
  snapEdges(columns, idToElem, 0.3 * u)

  const aspect = page.width / Math.max(1e-6, page.height)
  return {
    page: { width: page.width, height: page.height, aspect },
    columns,
    relations: [],
    unit: u,
    snappedElements: Array.from(idToElem.values()),
  }
}

// ===== XY-Cut 2D (full alternating recursion) =====
// Assumes NormElement has nx0, nx1, ny0, ny1, cx, cy, w, h in [0,1].

type XYCutOpts = {
  bins?: number               // histogram resolution per axis
  tau?: number                // a bin is "whitespace" if occupancy <= tau
  minValleyFrac?: number      // minimum valley width/height as fraction of region span
  minRegionWidth?: number     // stop if region too narrow for X cuts
  minRegionHeight?: number    // stop if region too short for Y cuts
  minElements?: number        // stop if too few elements to split usefully
  balanceBias?: number        // [0..1], split preference toward balanced partitions (0=none, 1=strong)
  capBinAccum?: number        // cap per-element contribution into a bin to reduce "bridging"
};

const XY_DEFAULTS: Required<XYCutOpts> = {
  bins: 64,
  tau: 0.04,
  minValleyFrac: 0.05,
  minRegionWidth: 0.12,
  minRegionHeight: 0.02,
  minElements: 3,
  balanceBias: 0.25,
  capBinAccum: 0.8,
};

function projX(elems: NormElement[], bins: number, cap: number) {
  if (elems.length === 0) return { x0: 0, x1: 1, occ: new Array(bins).fill(0), span: 1 };
  const x0 = Math.min(...elems.map(e => e.nx0));
  const x1 = Math.max(...elems.map(e => e.nx1));
  const span = Math.max(1e-6, x1 - x0);
  const wBin = span / bins;
  const occ = new Array(bins).fill(0);
  for (const e of elems) {
    const a0 = Math.max(x0, e.nx0), a1 = Math.min(x1, e.nx1);
    if (a1 <= a0) continue;
    const b0 = Math.max(0, Math.floor((a0 - x0) / wBin));
    const b1 = Math.min(bins - 1, Math.floor((a1 - x0) / wBin));
    // accumulate covered vertical fraction; cap per-element to reduce "bridging"
    const add = Math.min(cap, e.h);
    for (let b = b0; b <= b1; b++) occ[b] += add;
  }
  // normalize to [0,1]
  for (let b = 0; b < bins; b++) occ[b] = clamp01(occ[b]);
  return { x0, x1, occ, span };
}

function projY(elems: NormElement[], bins: number, cap: number) {
  if (elems.length === 0) return { y0: 0, y1: 1, occ: new Array(bins).fill(0), span: 1 };
  const y0 = Math.min(...elems.map(e => e.ny0));
  const y1 = Math.max(...elems.map(e => e.ny1));
  const span = Math.max(1e-6, y1 - y0);
  const hBin = span / bins;
  const occ = new Array(bins).fill(0);
  for (const e of elems) {
    const a0 = Math.max(y0, e.ny0), a1 = Math.min(y1, e.ny1);
    if (a1 <= a0) continue;
    const b0 = Math.max(0, Math.floor((a0 - y0) / hBin));
    const b1 = Math.min(bins - 1, Math.floor((a1 - y0) / hBin));
    // accumulate covered horizontal fraction; cap per-element to reduce "bridging"
    const add = Math.min(cap, e.w);
    for (let b = b0; b <= b1; b++) occ[b] += add;
  }
  for (let b = 0; b < bins; b++) occ[b] = clamp01(occ[b]);
  return { y0, y1, occ, span };
}

type Valley = { start: number; len: number; meanOcc: number; score: number };

function bestValley(
  occ: number[],
  tau: number,
  minBins: number,
  balanceTarget: number | null,
  balanceBias: number
): Valley | null {
  let best: Valley | null = null;
  let curStart = -1, curSum = 0, curLen = 0;

  const flush = () => {
    if (curLen <= 0) return;
    if (curLen >= minBins) {
      const meanOcc = curSum / curLen;
      // score valley by (width) * (emptiness); optionally prefer near-balanced splits
      let score = curLen * (1 - meanOcc);
      if (balanceTarget != null) {
        const cut = curStart + Math.floor(curLen / 2);
        const balancePenalty = Math.abs(cut - balanceTarget); // distance from center
        // higher penalty → lower score
        score *= (1 - balanceBias * (balancePenalty / Math.max(1, balanceTarget)));
      }
      const v = { start: curStart, len: curLen, meanOcc, score };
      if (!best || v.score > best.score) best = v;
    }
    curStart = -1; curSum = 0; curLen = 0;
  };

  for (let i = 0; i < occ.length; i++) {
    if (occ[i] <= tau) {
      if (curLen === 0) curStart = i;
      curLen++; curSum += occ[i];
    } else {
      flush();
    }
  }
  flush();
  return best;
}

function xycut2d(
  elems: NormElement[],
  opts: XYCutOpts = {},
  page: PageInfo
): number[][] {
  const O = { ...XY_DEFAULTS, ...opts };

  // recursive inner with mapping
  const rec = (subsetIdx: number[]): number[][] => {
    if (subsetIdx.length === 0) return [];
    if (subsetIdx.length <= O.minElements) return [subsetIdx];

    const subset = subsetIdx.map(i => elems[i]);

    // region extents & early exits
    const x0 = Math.min(...subset.map(e => e.nx0));
    const x1 = Math.max(...subset.map(e => e.nx1));
    const y0 = Math.min(...subset.map(e => e.ny0));
    const y1 = Math.max(...subset.map(e => e.ny1));
    const W = Math.max(1e-6, x1 - x0);
    const H = Math.max(1e-6, y1 - y0);

    // projections
    const px = projX(subset, O.bins, O.capBinAccum);
    const py = projY(subset, O.bins, O.capBinAccum);

    const minXBins = Math.max(1, Math.floor(O.minValleyFrac * px.occ.length));
    const minYBins = Math.max(1, Math.floor(O.minValleyFrac * py.occ.length));

    // balance target for nicer splits (center bin)
    const balX = Math.floor(px.occ.length / 2);
    const balY = Math.floor(py.occ.length / 2);

    // find best valleys on both axes (respecting region size)
    const vx = (W >= O.minRegionWidth)
      ? bestValley(px.occ, O.tau, minXBins, balX, O.balanceBias)
      : null;
    const vy = (H >= O.minRegionHeight)
      ? bestValley(py.occ, O.tau, minYBins, balY, O.balanceBias)
      : null;

    // no valid valleys → leaf
    if (!vx && !vy) return [subsetIdx];

    // choose axis by higher score
    const chooseX = vx && (!vy || vx.score >= vy.score);
    if (chooseX) {
      // cut at valley center along X
      const cutBin = vx!.start + Math.floor(vx!.len / 2);
      const cutX = x0 + (cutBin / px.occ.length) * W;

      const L: number[] = [], R: number[] = [];
      for (const i of subsetIdx) {
        const e = elems[i];
        (e.cx <= cutX ? L : R).push(i);
      }
      const out: number[][] = [];
      out.push(...rec(L));
      out.push(...rec(R));
      return out;
    } else {
      // cut at valley center along Y
      const cutBin = vy!.start + Math.floor(vy!.len / 2);
      const cutY = y0 + (cutBin / py.occ.length) * H;
      console.log('ycut whoa oh', (cutY * page.height).toFixed(0))
      const T: number[] = [], B: number[] = [];
      for (const i of subsetIdx) {
        const e = elems[i];
        (e.cy <= cutY ? T : B).push(i);
      }
      const out: number[][] = [];
      out.push(...rec(T));
      out.push(...rec(B));
      return out;
    }
  };

  const allIdx = elems.map((_, i) => i);
  return rec(allIdx).map(cluster => {
    // order within cluster by reading order
    const sorted = [...cluster].sort((i, j) => {
      const A = elems[i], B = elems[j];
      return A.ny0 - B.ny0 || A.nx0 - B.nx0;
    });
    return sorted;
  });
}

