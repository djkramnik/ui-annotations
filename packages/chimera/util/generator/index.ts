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
    bbox: [a.rect.x, a.rect.y, a.rect.x + a.rect.width, a.rect.y + a.rect.height], // [x0, y0, x1, y1]
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
          const [x0, y0, x1, y1] = getExtremesFromElems(layoutTree.snappedElements.filter((e) => r.blockIds.includes(e.id)))
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

// from a collection of normalized elements get the dimensions of a box that encompasses all of them
function getExtremesFromElems(elems: NormElement[]): [number, number, number, number] {
  return elems.reduce((acc, e) => {
    const [cx0, cy0, cx1, cy1] = acc
    return [
      Math.min(cx0, e.nx0),
      Math.min(cy0, e.ny0),
      Math.max(cx1, e.nx1),
      Math.max(cy1, e.ny1),
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