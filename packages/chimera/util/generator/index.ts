import { AnnotationPayload, ServiceManualLabel } from "ui-labelling-shared";
import { ElementInput, LayoutTree, NormElement, PageInfo } from "./infer-layout";

type Rect = AnnotationPayload['annotations'][0]['rect']

type DenormalizedElement = {
  id: string
  rect: Rect
  label: string
}

// the basis for creating a synthetic copy of the original annotations
// all of the pertinent annotations are organized into columns and rows, and snapped to grid (apparently)
export type UnpackedLayout = {
  columns: {
    xRange: [number, number],
    rows: {
      rect: Rect // based on the child elements draw a tight box at the extremes
      elems: string[] // original annotation reference ids
    }[]
    // should be basically the same as the original annotations, except adjusted so as to be snapped to grid
  }[]
  snappedElements: DenormalizedElement[]
}

export const toLayoutInput = (payload: AnnotationPayload): ElementInput[] => {
  return payload.annotations.map((a) => ({
    id: a.id,
    bbox: toBbox(a.rect), // [x0, y0, x1, y1]
    type: a.label as ServiceManualLabel
  }))
}

export function unpackLayoutTree(layoutTree: LayoutTree): UnpackedLayout {
  const { page, columns } = layoutTree

  return {
    snappedElements: layoutTree.snappedElements.map(e => toDenormalized(e, layoutTree.page)),
    columns: columns.map((c) => {
      return {
        xRange: c.xRange.map(n => denormalize(n, page.width)) as [number, number],
        rows: c.rowGroups.map(r => {
          const [x0, y0, x1, y1] = getExtremesFromElems(
            layoutTree.snappedElements
              .filter((e) => r.blockIds.includes(e.id))
              .map(e => [e.nx0, e.ny0, e.nx1, e.ny1])
          )
          return {
            elems: r.blockIds,
            rect: {
              x: denormalize(x0, page.width),
              y: denormalize(y0, page.height),
              width: denormalize(x1 - x0, page.width),
              height: denormalize(y1 - y0, page.height)
            }
          }
        }),
      }
    })
  }
}

export function flattenTree(unpacked: UnpackedLayout): AnnotationPayload['annotations'] {
  const layoutElems: AnnotationPayload['annotations'] = unpacked.columns.reduce((acc, c) => {
    return acc.concat([
      columnToAnnotation(c, unpacked.snappedElements),
      ...(c.rows.map(r => {
        return {
          id: crypto.randomUUID(),
          label: 'layout_tree_row',
          rect: r.rect
        }
      }))
    ])
  }, [] as AnnotationPayload['annotations'])
  return layoutElems.concat(unpacked.snappedElements)
}

// from a collection of normalized elements get the dimensions of a box that encompasses all of them
function getExtremesFromElems(bboxes: Array<[number, number, number, number]>): [number, number, number, number] {
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

function denormalize(n: number, s: number) {
  return Number((n * s).toFixed(0))
}

function toDenormalized(elem: NormElement, page: PageInfo): DenormalizedElement {
  return {
    id: elem.id,
    rect: {
      x: denormalize(elem.nx0, page.width),
      y: denormalize(elem.ny0, page.height),
      width: denormalize(elem.w, page.width),
      height: denormalize(elem.h, page.height),
    },
    label: elem.type
  }
}

function columnToAnnotation(column: UnpackedLayout['columns'][0], elems: DenormalizedElement[]): AnnotationPayload['annotations'][0] {
  const elemsInColumn: DenormalizedElement[]
    = column.rows.reduce((acc, r) => {
      return acc.concat(r.elems.map(id => elems.find(e => e.id === id)!))
    }, [] as DenormalizedElement[])


  const colBoundingBox = getExtremesFromElems(
    elemsInColumn.map(e => toBbox(e.rect))
  )

  return {
    id: crypto.randomUUID(),
    label: 'layout_tree_column',
    rect: toRect(colBoundingBox)
  }
}

// [x0, y0, x1, y1]
function toBbox(r: Rect): [number, number, number, number] {
  return [r.x, r.y, r.x + r.width, r.y + r.height]
}

function toRect(bbox: [number, number, number, number]): Rect {
  return {
    x: bbox[0],
    y: bbox[1],
    width: bbox[2] - bbox[0],
    height: bbox[3] - bbox[1],
  }
}