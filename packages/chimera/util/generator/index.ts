import { getRegion, LayoutTree } from "infer-layout";
import { XyNode } from "infer-layout/dist/util";
import { AnnotationPayload } from "ui-labelling-shared";

type SingleAnnotation = AnnotationPayload['annotations'][0]
type Rect = SingleAnnotation['rect']
// just return a flattened array of annotations
export const unpackLayoutTree = (layoutTree: LayoutTree): AnnotationPayload['annotations'] => {
  const {page, columns, snappedComponents} = layoutTree

  const colPad = 4
  const denormalizedCols = columns.map(c => {
    const [cx0, cy0, cx1, cy1] = getRegion(
      c.blockIdsInColumn.map(id => snappedComponents.find(sc => sc.id === id).bbox)
    )
    return {
      id: crypto.randomUUID(),
      rect: bboxToRect([
        cx0 - colPad,
        cy0 - colPad,
        cx1 + colPad,
        cy1 + colPad,
      ]),
      label: `layout_tree_column`
    }
  })
  const denomalizedRows = columns.reduce((acc, c) => {
    return acc.concat(c.rowGroups
      .filter(({ blockIds }) => blockIds.length > 1)
      .reduce((acc, rg) => {

      const boxes: [number, number, number, number][]
        = rg.blockIds.map(id => snappedComponents.find(sc => sc.id === id).bbox)
      return acc.concat(
        boxes.map(b => ({
          id: crypto.randomUUID(),
          rect: bboxToRect(b),
          label: `layout_tree_row`
        }))
      )
    }, [] as SingleAnnotation[]))
  }, [] as SingleAnnotation[])

  const denormalizedSnapped = snappedComponents.map(c => componentToAnnotation(c, page.width, page.height))
  return denormalizedSnapped
    .concat(denormalizedCols)
    .concat(denomalizedRows)
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