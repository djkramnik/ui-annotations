import { LayoutTree, XyNode } from "infer-layout";
import { AnnotationPayload } from "ui-labelling-shared";

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

function bboxToRect([x0, y0, x1, y1]: [number, number, number, number]): Rect {
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
  const { maxFrac, tol: tolFrac } = opts

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
