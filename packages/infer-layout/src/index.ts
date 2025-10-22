// simplified xy cut typescript implementation
// currently no binning or projections.  relies on pure empty bands for splits

import {
  Bbox,
  bestSplit,
  clamp01,
  Component,
  getHorizontalGutters,
  getVerticalGutters,
  nearlyEqual,
  splitOnGutter,
  XyNode,
} from './util'

type PageDim = { width: number; height: number }

type ComponentMap = Record<string, Component>

export { buildLayoutTree, LayoutTree } from './layout'
export { getRegion } from './util'

export function xyCut({
  components: _components,
  page,
  withNormalization,
  minGap, // baseline height, somewhat related to the height of a line of text, to determine minimum gap size on splits
}: {
  components: Component[]
  page: PageDim
  withNormalization?: boolean
  minGap: number
}): XyNode {
  const minG = withNormalization
    ? minGap / page.height // normalize min gap
    : minGap
  const components = withNormalization
    ? normalize(_components, page)
    : _components.slice(0)

  const componentMap: ComponentMap = components.reduce((acc, c) => {
    return {
      ...acc,
      [c.id]: c,
    }
  }, {} as ComponentMap)

  const rootNode: XyNode = {
    region: withNormalization
      ? [0, 0, 1, 1] // normalized page region
      : [0, 0, page.width, page.height],
    components: Object.keys(componentMap),
  }
  // recursive mutation shenanigans
  splitNode({
    node: rootNode,
    dict: componentMap,
    minG,
  })
  return rootNode
}

function splitNode({
  node,
  dict,
  minG,
}: {
  node: XyNode
  dict: Record<string, Component>
  minG: number
}) {
  const [rx0, ry0, rx1, ry1] = node.region

  // if we only have one or less box in the region just return
  if (node.components.length < 2) {
    return
  }

  const boxes = node.components.map((id) => dict[id]!.bbox)
  const vMin = Math.max(0.005 * (rx1 - rx0), minG) // min width for a vertial gutter.  clamped to half a percent of total space
  const hMin = Math.max(0.005 * (ry1 - ry0), minG) // min height for a horizontal gutter.

  // get the gutters and filter out too small gutters + gutters adjacent to the region bounds (i.e margins)

  const _vGutters = getVerticalGutters(node.region, boxes)
  const vGutters = _vGutters.filter(
    ([x0, x1]) =>
      x1 - x0 >= vMin && !nearlyEqual(x0, rx0) && !nearlyEqual(x1, rx1),
  )
  const _hGutters = getHorizontalGutters(node.region, boxes)
  const hGutters = _hGutters.filter(
    ([y0, y1]) =>
      y1 - y0 >= hMin && !nearlyEqual(y0, ry0) && !nearlyEqual(y1, ry1),
  )

  // we found no meaningful split in this region. Let it go jake. it's leaf node.
  if (!vGutters.length && !hGutters.length) {
    return
  }

  // from the qualifying gutters, find the best to split on
  const { winner, idx: gIdx } = bestSplit({
    cleanVGutters: vGutters,
    cleanHGutters: hGutters,
    region: node.region,
  })

  const [n1, n2] = splitOnGutter({
    axis: winner === 'vGutter' ? 'X' : 'Y',
    gutter: winner === 'vGutter' ? vGutters[gIdx] : hGutters[gIdx],
    region: node.region,
    components: node.components.map((id) => dict[id]),
  })

  node.children = [n1, n2]

  for (const childNode of node.children) {
    splitNode({ node: childNode, dict, minG })
  }
}

function normalize(components: Component[], page: PageDim): Component[] {
  return components.map((c) => ({
    ...c,
    bbox: [
      c.bbox[0] / page.width,
      c.bbox[1] / page.height,
      c.bbox[2] / page.width,
      c.bbox[3] / page.height,
    ].map(clamp01) as Bbox,
  }))
}
