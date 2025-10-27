import { LayoutTree, XyNode } from "infer-layout";
import { AnnotationPayload } from "ui-labelling-shared";
import { PreviewSchema } from "../localstorage";

type SingleAnnotation = AnnotationPayload['annotations'][0]
export type Rect = SingleAnnotation['rect']
// just return a flattened array of annotations
export const unpackLayoutTree = (layoutTree: LayoutTree): AnnotationPayload['annotations'] => {
  const {page, regions, snappedComponents} = layoutTree

  const denormalizedRegions = regions.map(r => {
    return {
      id: crypto.randomUUID(),
      rect: bboxToRect(r.bounds),
      label: `layout_tree_column`
    }
  })

  const denormalizedSnapped = snappedComponents.map(c => componentToAnnotation(c, page.width, page.height))
  return denormalizedSnapped
    .concat(denormalizedRegions)
}

export const regionsToAnnotations = (regions: Array<{
  region: Bbox
}>) => {
  return regions.map(r => {
    return {
      id: crypto.randomUUID(),
      rect: bboxToRect(r.region),
      label: `layout_tree_column`
    }
  })
}

function componentToAnnotation(component: LayoutTree['snappedComponents'][0], w: number, h: number): SingleAnnotation {
  return {
    id: component.id,
    rect: bboxToRect(component.bbox),
    label: component.type
  }
}

export function bboxToRect([x0, y0, x1, y1]: [number, number, number, number]): Rect {
  return {
    x: x0,
    y: y0,
    width: (x1 - x0),
    height: (y1 - y0)
  }
}

export function xyNodeToAnnotations(node: XyNode, label?: string): AnnotationPayload['annotations'] {
  let annotations: AnnotationPayload['annotations'] = []

  ;(function recurse(node: XyNode) {
    // push current node on to stack
    annotations.push({
      id: crypto.randomUUID(),
      label: label ?? `layout_tree_column`,
      rect: bboxToRect(node.region)
    })
    if (!node.children) {
      return
    }
    for(const childNode of node.children) {
      recurse(childNode)
    }
  })(node)

  return annotations
}

export type Bbox = [number, number, number, number];
export type Interval = [number, number];

export function mergeColsFlat({
  node,
  pageW,
  opts = { maxFrac: 0.7, tol: 0.05 },
}: {
  node: XyNode;
  pageW: number;
  opts?: Partial<{ maxFrac: number; tol: number }>;
}): Array<{ region: Bbox; components: string[] }> {
  const { maxFrac = 0.7, tol: tolFrac = 0.05 } = opts

  const w = (b: Bbox) => b[2] - b[0];
  const h = (b: Bbox) => b[3] - b[1];
  const union = (a: Bbox, b: Bbox): Bbox => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];

  // Gather all leaves
  const leaves: Array<{ region: Bbox; components: string[] }> = [];
  (function collect(n: XyNode) {
    if (!n.children) { leaves.push({ region: n.region, components: n.components }); return; }
    collect(n.children[0]); collect(n.children[1]);
  })(node);

  // Decide if two boxes belong to the same vertical column
  function stackedWithTol(a: Bbox, b: Bbox): boolean {
    const wa = w(a), wb = w(b), wRef = Math.max(1, (wa + wb) / 2);
    const tolX = tolFrac * wRef;

    // x alignment within tolerance
    const xAligned = Math.abs(a[0] - b[0]) <= tolX && Math.abs(a[2] - b[2]) <= tolX;

    // vertical relation: touching / tiny overlap / tiny gap
    const vOverlap = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); // >0 overlap, 0 touch, <0 gap
    const minH = Math.max(1, Math.min(h(a), h(b)));
    const verticallyStacked = vOverlap >= -tolFrac * minH; // allow small gap

    // column width constraint
    const spanFrac = (Math.max(a[2], b[2]) - Math.min(a[0], b[0])) / Math.max(1, pageW);

    return xAligned && verticallyStacked && spanFrac <= maxFrac;
  }

  // Iteratively merge any pair that qualifies (handles non-siblings)
  let changed = true;
  let items = leaves.slice();
  while (changed) {
    changed = false;
    const used = new Array(items.length).fill(false);
    const next: Array<{ region: Bbox; components: string[] }> = [];

    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      let mergedRegion = items[i].region;
      let mergedComps = items[i].components.slice();
      used[i] = true;

      // Greedy absorb all stack-compatible neighbors (may chain)
      for (let j = 0; j < items.length; j++) {
        if (used[j]) continue;
        if (stackedWithTol(mergedRegion, items[j].region)) {
          mergedRegion = union(mergedRegion, items[j].region);
          mergedComps.push(...items[j].components);
          used[j] = true;
          changed = true;
          // restart scan to allow chaining with new mergedRegion
          j = -1;
        }
      }
      next.push({ region: mergedRegion, components: mergedComps });
    }
    items = next;
  }

  return items;
}

function clamp(n: number, a = 0, b = 1) { return Math.max(a, Math.min(b, n)); }

export function getHeaderLevel({
  rect,
  textContent,
  pageWidth,
  fontPx,
}: {
  rect: Rect,
  textContent: string,
  pageWidth: number,
  fontPx: number
}): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' {

  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const chars = Math.max(1, textContent.trim().length);
  const widthRatio = clamp(w / Math.max(1, pageWidth));           // 0–1                                 // proxy for font size
  const fontScore = clamp(fontPx / 20);                      // ~20px/char ≈ large
  const heightScore = clamp(h / 120);                              // 120px tall ≈ very large
  const shortBonus = chars <= 12 ? 0.2 : 0;
  const score = clamp(0.5 * fontScore + 0.3 * widthRatio + 0.1 * heightScore + shortBonus);

  if (score >= 0.85) return 'h1';
  if (score >= 0.65) return 'h2';
  if (score >= 0.45) return 'h3';
  if (score >= 0.25) return 'h4';
  return 'h5';
}

export function estimateFontAndTrackingBox(
  rect: Rect,
  text: string, // may include \n
  opts?: {
    lineHeight?: number;           // default 1.25
    advPerEm?: number;             // default 0.55
    lineCount?: number;            // optional known line count
    letterSpacingClamp?: [number, number]; // default [-0.5, 2] px
    maxFontGrowPct?: number;       // allow small grow to fix width; default 0.08 (8%)
  }
) {
  const LINE_H = opts?.lineHeight ?? 1.25;
  const ADV    = opts?.advPerEm   ?? 0.55;
  const [LS_MIN, LS_MAX] = opts?.letterSpacingClamp ?? [-0.5, 2];
  const MAX_GROW = opts?.maxFontGrowPct ?? 0.08;

  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b), "");
  const W = Math.max(1, rect.width);
  const H = Math.max(1, rect.height);

  // 1) Infer line count (or use provided)
  //    Seed font from width to get a reasonable first pass for L.
  const seedFont = (W / Math.max(1, longest.length)) / ADV;
  const seedLineH = Math.max(1, seedFont * LINE_H);
  const L = Math.max(1, opts?.lineCount ?? Math.round(H / seedLineH));

  // 2) Baseline font from height (keeps total height ≈ rect.height)
  const fontH = H / (L * LINE_H);

  // 3) Raw letter-spacing to fit width with that font
  const n = Math.max(1, longest.length);
  let lsRaw = 0;
  if (n > 1) lsRaw = (W - fontH * (ADV * n)) / (n - 1);

  // 4) Clamp letter-spacing
  const lsClamped = Math.min(LS_MAX, Math.max(LS_MIN, lsRaw));

  // 5) If clamped changed width, try a small font bump to compensate
  let fontPx = fontH;
  if (n > 1 && Math.abs(lsClamped - lsRaw) > 1e-3) {
    const fontNeeded = (W - lsClamped * (n - 1)) / (ADV * n);
    const maxAllowed = fontH * (1 + MAX_GROW);
    fontPx = Math.min(fontNeeded, maxAllowed);
  } else if (n === 1) {
    // Single-character line: width depends only on font; try to match W but cap growth
    const fontNeeded = W / (ADV * n);
    const maxAllowed = fontH * (1 + MAX_GROW);
    fontPx = Math.min(fontNeeded, maxAllowed);
  }

  return { fontPx, letterSpacingPx: n > 1 ? lsClamped : 0, lineCount: L };
}

// estimate the top and left padding for a given region
export function estimateRegionPad(
  regionId: number,
  schema: PreviewSchema
): {
  top: number
  left: number
} {
  const { components: cids, rect: regionRect } = schema.layout[regionId]
  if (cids.length < 1) {
    return { top: 0, left: 0 }
  }

  const { minLeft, minTop }
    = schema.annotations.payload.annotations
      .reduce((acc, a) => {
        if (!cids.includes(a.id)) {
          return acc
        }
        return {
          minLeft: Math.min(a.rect.x, acc.minLeft),
          minTop: Math.min(a.rect.y, acc.minTop),
        }
      }, { minLeft: Infinity, minTop: Infinity } as {
        minLeft: number
        minTop: number
      })

  if (minLeft === Infinity || minTop === Infinity) {
    throw Error('seriously wtf')
  }

  return {
    top: minTop - regionRect.y,
    left: minLeft - regionRect.x,
  }
}

export function getRegionLayoutDirection(components: Rect[]): 'row' | 'col' {
  if (components.length <= 1) return 'col';

  // Compute component centers
  const centers = components.map(r => ({
    cx: r.x + r.width / 2,
    cy: r.y + r.height / 2,
  }));

  // Get spreads
  const minX = Math.min(...centers.map(c => c.cx));
  const maxX = Math.max(...centers.map(c => c.cx));
  const minY = Math.min(...centers.map(c => c.cy));
  const maxY = Math.max(...centers.map(c => c.cy));

  const horizontalSpread = maxX - minX;
  const verticalSpread = maxY - minY;

  // Simple heuristic: whichever spread dominates determines direction
  const ratio = verticalSpread / (horizontalSpread + 1e-6); // avoid div/0

  // >1.3 → stacked vertically → column layout
  // <1.3 → row-like (wider horizontally)
  return ratio > 1.3 ? 'col' : 'row';
}
