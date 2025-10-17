/** layout_inference.ts
 *  Infers columns, rows, and relations from noisy element boxes.
 *  No external deps. Drop-in TS.
 */

///////////////////////
// Types & Interfaces
///////////////////////

export type BBox = [number, number, number, number]; // [x0,y0,x1,y1] in page units (points or px)

export type ElementType =
  | "heading"
  | "subheading"
  | "text"
  | "ordered_list"
  | "unordered_list"
  | "warning"
  | "note"
  | "table"
  | "figure"
  | "diagram"
  | "image"
  | "icon_legend"
  | "other";

export interface ElementInput {
  id: string;
  type: ElementType;
  bbox: BBox; // in page coordinates
}

export interface PageInfo {
  width: number;  // page width in same units as bbox (e.g., points or px)
  height: number; // page height
}

export interface NormElement extends ElementInput {
  // normalized to [0,1] coordinate space
  nx0: number; ny0: number; nx1: number; ny1: number;
  cx: number; cy: number;  // centers (normalized)
  w: number; h: number;    // width/height (normalized)
}

export interface Row {
  blockIds: string[]; // ordered top→bottom within the row scan
}

export interface ColumnLayout {
  xRange: [number, number];  // normalized [x0,x1]
  rowGroups: Row[];
  blockIdsInColumn: string[]; // convenience (ordered by y0)
}

export type RelationType = "captionOf" | "asideOf";
export interface Relation {
  type: RelationType;
  fromId: string;
  toId: string;
}

export interface LayoutTree {
  page: { width: number; height: number; aspect: number };
  columns: ColumnLayout[];
  relations: Relation[];
  unit: number; // the inferred base unit (median text height, normalized)
}

///////////////////////
// Utility functions
///////////////////////

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function median(v: number[]): number {
  if (v.length === 0) return 0;
  const a = [...v].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : 0.5 * (a[mid - 1] + a[mid]);
}

function iqrClip(values: number[], lowQ = 0.1, highQ = 0.9): number[] {
  if (values.length === 0) return values;
  const a = [...values].sort((x, y) => x - y);
  const q = (p: number) => {
    const i = (a.length - 1) * p;
    const i0 = Math.floor(i), i1 = Math.ceil(i);
    return i0 === i1 ? a[i0] : a[i0] + (a[i1] - a[i0]) * (i - i0);
  };
  const lo = q(lowQ), hi = q(highQ);
  return a.filter(x => x >= lo && x <= hi);
}

function overlap1D(a0: number, a1: number, b0: number, b1: number): number {
  const left = Math.max(a0, b0);
  const right = Math.min(a1, b1);
  return Math.max(0, right - left);
}

function rangeUnion(a0: number, a1: number, b0: number, b1: number): [number, number] {
  return [Math.min(a0, b0), Math.max(a1, b1)];
}

function nearlyEqual(a: number, b: number, eps: number) {
  return Math.abs(a - b) <= eps;
}

///////////////////////
// Core Steps
///////////////////////

/** 1) Normalize coordinates to [0,1] and derive features */
export function normalize(elements: ElementInput[], page: PageInfo): NormElement[] {
  const { width: W, height: H } = page;
  return elements.map((e) => {
    const [x0, y0, x1, y1] = e.bbox;
    const nx0 = clamp01(x0 / W), nx1 = clamp01(x1 / W);
    const ny0 = clamp01(y0 / H), ny1 = clamp01(y1 / H);
    const w = Math.max(0, nx1 - nx0);
    const h = Math.max(0, ny1 - ny0);
    return {
      ...e,
      nx0, ny0, nx1, ny1,
      w, h,
      cx: w > 0 ? (nx0 + nx1) / 2 : nx0,
      cy: h > 0 ? (ny0 + ny1) / 2 : ny0,
    };
  });
}

/** Heuristic: which types are text-like? (tune per your ontology) */
function isTextLike(t: ElementType) {
  return t === "text" || t === "heading" || t === "subheading" || t === "ordered_list" || t === "unordered_list" || t === "warning" || t === "note";
}

/** 2) Estimate the base unit `u` = median text height (normalized) */
export function estimateUnit(elems: NormElement[]): number {
  const heights = elems
    .filter(e => isTextLike(e.type))
    .map(e => e.h);
  const pool = heights.length ? heights : elems.map(e => e.h); // fallback to all
  const clipped = iqrClip(pool);
  const u = median(clipped);
  // clamp to a sane range
  return Math.max(0.0025, Math.min(u, 0.08));
}

/** 3) Merge micro fragments (e.g., split lines of the same paragraph) */
export function mergeMicroFragments(elems: NormElement[], u: number): NormElement[] {
  // Simple O(n log n) sweep by y, then attempt merges with neighbors.
  const sorted = [...elems].sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0);
  const used = new Set<string>();
  const out: NormElement[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (used.has(a.id) || !isTextLike(a.type)) {
      if (!used.has(a.id)) out.push(a);
      continue;
    }

    let merged = { ...a };
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (used.has(b.id) || !isTextLike(b.type)) continue;
      // require decent horizontal overlap and tiny vertical gap or slight overlap
      const xOverlap = overlap1D(merged.nx0, merged.nx1, b.nx0, b.nx1);
      const minW = Math.max(1e-6, Math.min(merged.w, b.w));
      const xOverlapRatio = xOverlap / minW;
      const vGap = b.ny0 - merged.ny1;
      const yOverlap = overlap1D(merged.ny0, merged.ny1, b.ny0, b.ny1);
      const yOverlapRatio = yOverlap / Math.max(1e-6, Math.min(merged.h, b.h));

      const closeHoriz = xOverlapRatio > 0.3;
      const smallVGap = vGap >= 0 && vGap < 0.25 * u;
      const slightOverlap = yOverlapRatio > 0.05;

      if (closeHoriz && (smallVGap || slightOverlap)) {
        // merge b into merged
        const nx0 = Math.min(merged.nx0, b.nx0);
        const ny0 = Math.min(merged.ny0, b.ny0);
        const nx1 = Math.max(merged.nx1, b.nx1);
        const ny1 = Math.max(merged.ny1, b.ny1);
        merged = {
          ...merged,
          nx0, ny0, nx1, ny1,
          w: nx1 - nx0, h: ny1 - ny0,
          cx: (nx0 + nx1) / 2, cy: (ny0 + ny1) / 2,
          id: merged.id, // keep original id; you could concatenate if you need provenance
        };
        used.add(b.id);
      }
    }
    out.push(merged);
    used.add(merged.id);
  }

  // Re-normalize ordering
  return out.sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0);
}

/** Helper to compute x-range for a set of elements */
function columnXRange(blocks: NormElement[]): [number, number] {
  let x0 = Infinity, x1 = -Infinity;
  for (const b of blocks) {
    x0 = Math.min(x0, b.nx0);
    x1 = Math.max(x1, b.nx1);
  }
  if (!isFinite(x0) || !isFinite(x1)) return [0, 1];
  return [x0, x1];
}

/** 4) Column detection by clustering element x-centers with a distance threshold. */
export function clusterColumns(elems: NormElement[], cxGapThreshold = 0.08): number[][] {
  if (elems.length === 0) return [];

  // Sort by x-center
  const sorted = [...elems].sort((a, b) => a.cx - b.cx);
  const clusters: number[][] = [];
  let current: number[] = [0];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gap = Math.abs(cur.cx - prev.cx);
    if (gap > cxGapThreshold) {
      clusters.push(current);
      current = [i];
    } else {
      current.push(i);
    }
  }
  clusters.push(current);

  // post-merge clusters with heavy x-range overlap
  const resolved: number[][] = [];
  for (const idxs of clusters) {
    const blocks = idxs.map(i => sorted[i]);
    const [x0a, x1a] = columnXRange(blocks);

    let merged = false;
    for (let k = 0; k < resolved.length; k++) {
      const existingBlocks = resolved[k].map(i => sorted[i]);
      const [x0b, x1b] = columnXRange(existingBlocks);
      const overlap = overlap1D(x0a, x1a, x0b, x1b);
      const denom = Math.min(x1a - x0a, x1b - x0b, 1e9);
      const overlapRatio = denom > 0 ? overlap / denom : 0;
      if (overlapRatio > 0.4) {
        resolved[k] = resolved[k].concat(idxs);
        merged = true;
        break;
      }
    }
    if (!merged) resolved.push(idxs);
  }

  // Sort elements within each cluster by y0 (reading order)
  for (const c of resolved) {
    c.sort((i, j) => sorted[i].ny0 - sorted[j].ny0 || sorted[i].nx0 - sorted[j].nx0);
  }

  // Return clusters as indices into the ORIGINAL `elems` array order
  // We need to map sorted indices back to the original.
  const idToIndex = new Map<string, number>();
  elems.forEach((e, idx) => idToIndex.set(e.id, idx));
  return resolved.map(clusterIdxs => clusterIdxs.map(i => idToIndex.get(sorted[i].id)!).filter(i => i !== undefined));
}

/** 5) Row grouping within a column by vertical gap + y-overlap heuristics */
export function groupRowsInColumn(blocks: NormElement[], u: number): Row[] {
  if (blocks.length === 0) return [];
  const sorted = [...blocks].sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0);

  // Estimate a flexible gap threshold from local gaps
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(Math.max(0, sorted[i].ny0 - sorted[i - 1].ny1));
  }
  const baseGap = median(iqrClip(gaps));
  const gapThreshold = Math.max(1.5 * u, (baseGap || 0) * 1.2);

  const rows: Row[] = [];
  let current: string[] = [sorted[0].id];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const vgap = Math.max(0, cur.ny0 - prev.ny1);
    const yOv = overlap1D(prev.ny0, prev.ny1, cur.ny0, cur.ny1);
    const yOvRatio = yOv / Math.max(1e-6, Math.min(prev.h, cur.h));

    const sameRow = vgap <= gapThreshold || yOvRatio > 0.1;
    if (sameRow) {
      current.push(cur.id);
    } else {
      rows.push({ blockIds: current });
      current = [cur.id];
    }
  }
  if (current.length) rows.push({ blockIds: current });
  return rows;
}

/** 6) Special structure detection: figure + caption */
export function detectFigureCaptions(columns: ColumnLayout[], idToElem: Map<string, NormElement>, u: number): Relation[] {
  const rels: Relation[] = [];
  for (const col of columns) {
    // Flatten blocks by y-order
    const blocks = [...col.blockIdsInColumn].map(id => idToElem.get(id)!).filter(Boolean);
    for (let i = 0; i < blocks.length - 1; i++) {
      const a = blocks[i];
      const b = blocks[i + 1];
      const aIsFig = a.type === "figure" || a.type === "diagram" || a.type === "image";
      const bIsText = isTextLike(b.type);
      if (!aIsFig || !bIsText) continue;

      const vgap = Math.max(0, b.ny0 - a.ny1);
      const widthSimilarity = 1 - Math.abs(a.w - b.w) / Math.max(a.w, b.w, 1e-6);
      if (vgap < 1.0 * u && widthSimilarity > 0.6) {
        rels.push({ type: "captionOf", fromId: b.id, toId: a.id });
      }
    }
  }
  return rels;
}

/** 7) Aside detection: narrow block overlapping a much bigger neighbor in another column */
export function detectAsides(columns: ColumnLayout[], idToElem: Map<string, NormElement>): Relation[] {
  const rels: Relation[] = [];
  if (columns.length < 2) return rels;

  // For each block in each column, see if it vertically overlaps a large block in another column
  const allByCol = columns.map(c => c.blockIdsInColumn.map(id => idToElem.get(id)!).filter(Boolean));

  for (let i = 0; i < allByCol.length; i++) {
    for (const a of allByCol[i]) {
      const narrow = a.w < 0.22; // heuristic
      if (!narrow) continue;
      for (let j = 0; j < allByCol.length; j++) {
        if (j === i) continue;
        for (const b of allByCol[j]) {
          const yOv = overlap1D(a.ny0, a.ny1, b.ny0, b.ny1);
          const yOvRatio = yOv / Math.max(1e-6, Math.min(a.h, b.h));
          const muchBigger = b.h > a.h * 1.6 && b.w > a.w * 1.6;
          if (yOvRatio > 0.4 && muchBigger) {
            rels.push({ type: "asideOf", fromId: a.id, toId: b.id });
            break;
          }
        }
      }
    }
  }

  return rels;
}

/** 8) Edge snapping within a column to reduce jitter (softly align left/right edges) */
export function snapEdges(columns: ColumnLayout[], idToElem: Map<string, NormElement>, epsilon: number) {
  for (const col of columns) {
    const ids = col.blockIdsInColumn;
    if (ids.length === 0) continue;

    // collect candidate left/right edges
    const lefts = ids.map(id => idToElem.get(id)!.nx0);
    const rights = ids.map(id => idToElem.get(id)!.nx1);

    const snap = (vals: number[]) => {
      // bucket edges into modes within epsilon*2 window
      const buckets: number[][] = [];
      for (const v of vals.sort((a, b) => a - b)) {
        let placed = false;
        for (const b of buckets) {
          if (Math.abs(b[b.length - 1] - v) <= 2 * epsilon) {
            b.push(v);
            placed = true;
            break;
          }
        }
        if (!placed) buckets.push([v]);
      }
      // representative is median of each bucket
      return buckets.map(b => ({ rep: median(b), members: b }));
    };

    const lBuckets = snap(lefts);
    const rBuckets = snap(rights);

    // apply snapping
    for (const id of ids) {
      const e = idToElem.get(id)!;
      const lRep = lBuckets.find(b => b.members.some(v => nearlyEqual(v, e.nx0, 2 * epsilon)))?.rep;
      const rRep = rBuckets.find(b => b.members.some(v => nearlyEqual(v, e.nx1, 2 * epsilon)))?.rep;
      if (typeof lRep === "number" && Math.abs(lRep - e.nx0) <= epsilon) {
        e.nx0 = lRep; e.w = e.nx1 - e.nx0; e.cx = (e.nx0 + e.nx1) / 2;
      }
      if (typeof rRep === "number" && Math.abs(rRep - e.nx1) <= epsilon) {
        e.nx1 = rRep; e.w = e.nx1 - e.nx0; e.cx = (e.nx0 + e.nx1) / 2;
      }
    }
  }
}

/** 9) Build the final layout tree */
export function buildLayoutTree(
  elems: NormElement[],
  page: PageInfo,
  cxGapThreshold = 0.08
): LayoutTree {
  const u = estimateUnit(elems);

  // Optionally merge micro-fragments first
  const merged = mergeMicroFragments(elems, u);

  // Cluster columns (returns arrays of indices into `merged`)
  const clusters = clusterColumns(merged, cxGapThreshold);

  // Construct columns
  const idToElem = new Map<string, NormElement>();
  merged.forEach(e => idToElem.set(e.id, e));

  const columns: ColumnLayout[] = clusters.map(idxArr => {
    const blocks = idxArr.map(i => merged[i]);
    const xR = columnXRange(blocks);
    const ordered = [...blocks].sort((a, b) => a.ny0 - b.ny0 || a.nx0 - b.nx0);
    const rows = groupRowsInColumn(ordered, u);
    return {
      xRange: xR,
      rowGroups: rows,
      blockIdsInColumn: ordered.map(b => b.id),
    };
  });

  // Sort columns left → right
  columns.sort((a, b) => a.xRange[0] - b.xRange[0]);

  // Detect relations
  const captionRels = detectFigureCaptions(columns, idToElem, u);
  const asideRels = detectAsides(columns, idToElem);

  // Snap edges to reduce jitter
  snapEdges(columns, idToElem, 0.3 * u);

  const aspect = page.width / Math.max(1e-6, page.height);
  return {
    page: { width: page.width, height: page.height, aspect },
    columns,
    relations: [...captionRels, ...asideRels],
    unit: u,
  };
}

///////////////////////
// Example usage (remove or adapt in your app)
///////////////////////

// If you want to test quickly, uncomment:
/*
const page: PageInfo = { width: 612, height: 792 }; // Letter (pts)
const inputs: ElementInput[] = [
  { id: "h1", type: "heading", bbox: [54, 54, 558, 96] },
  { id: "p1", type: "text", bbox: [54, 110, 350, 170] },
  { id: "p2", type: "text", bbox: [54, 176, 350, 230] },
  { id: "warn", type: "warning", bbox: [360, 110, 558, 190] },
  { id: "fig", type: "figure", bbox: [54, 360, 558, 620] },
  { id: "cap", type: "text", bbox: [54, 622, 558, 650] },
];

const norm = normalize(inputs, page);
const tree = buildLayoutTree(norm, page);
console.log(JSON.stringify(tree, null, 2));
*/

///////////////////////
// Notes for Extension
///////////////////////
// - Tune `cxGapThreshold` to split or fuse columns more/less aggressively.
// - Use `fontSize` if available to refine `estimateUnit`.
// - Add a `detectTables()` pass by scanning for repeated aligned x-edges.
// - Add type-aware thresholds (e.g., bigger acceptable gaps around figures).
// - Feed the resulting LayoutTree into your renderer (HTML/Canvas/SVG) to
//   produce a screenshot at a PDF-like aspect ratio (e.g., 816×1056 px).
