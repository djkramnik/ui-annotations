// simplified xy cut typescript implementation
// currently no binning or projections.  relies on pure empty bands for splits

import { Bbox, bestSplit, clamp01, Component, getHorizontalGutters, getRegion, getVerticalGutters, nearlyEqual, XyNode } from "./util"

type PageDim = { width: number, height: number }

type ComponentMap = Record<string, Component>

export function xyCut({
  components,
  page,
  unitHeight // height of a single line of text to use as a baseline
}: {
  components: Component[]
  page: PageDim
  unitHeight: number
}): XyNode {
  const unitH = unitHeight / page.height // normalize unit height
  const normalizedComponents = normalize(components, page)

  const componentMap: ComponentMap
    = normalizedComponents.reduce((acc, c) => {
      return {
        ...acc,
        [c.id]: c
      }
    }, {} as ComponentMap)

  const rootNode: XyNode = {
    region: [0, 0, 1, 1], // normalized page region
    components: Object.keys(componentMap)
  }
  // recursive mutation shenanigans
  splitNode({
    node: rootNode,
    dict: componentMap,
    unitH
  })
  return rootNode
}

function splitNode({
  node,
  dict,
  unitH,
}: {
  node: XyNode
  dict: Record<string, Component>
  unitH: number
}) {
  const [rx0, ry0, rx1, ry1] = node.region
  const boxes = node.components.map(id => dict[id]!.bbox)

  // if we only have one or less box in the region just return
  if (boxes.length < 2) {
    return
  }

  const vMin = Math.max(0.05 * (rx1 - rx0), 1.2 * unitH) // min width for a vertial gutter
  const hMin = Math.max(0.05 * (ry1 - ry0), 1.2 * unitH) // min height for a horizontal gutter

  // get the gutters and filter out too small gutters + gutters adjacent to the region bounds (i.e margins)
  const vGutters = getVerticalGutters(node.region, boxes)
    .filter(([x0, x1]) => x1 - x0 >= vMin && !nearlyEqual(x0, rx0) && !nearlyEqual(x1, rx1))

  const hGutters = getHorizontalGutters(node.region, boxes)
    .filter(([y0, y1]) => y1- y0 >= hMin && !nearlyEqual(y0, ry0) && !nearlyEqual(y1, ry1))

  // we found no meaningful split in this region. Let it go jake. it's leaf node.
  if (!vGutters.length && !hGutters.length) {
    return
  }

  // from the qualifying gutters, find the best to split on
  const { winner, idx } = bestSplit({
    cleanVGutters: vGutters,
    cleanHGutters: hGutters,
    region: node.region
  })



}

function normalize(components: Component[], page: PageDim): Component[] {
  return components.map(c => ({
    ...c,
    bbox: [
      c.bbox[0] / page.width,
      c.bbox[1] / page.height,
      c.bbox[2] / page.width,
      c.bbox[3] / page.height,
    ].map(clamp01) as Bbox
  }))
}