// xy cut typescript implementation

import { Bbox, clamp01, getRegion } from "./util"

type XyNode = {
  bbox: Bbox
  elems: string[] // string ids
  children?: [XyNode, XyNode]
}

type Component = {
  id: string
  type: string
  bbox: Bbox
}

type PageDim = { width: number, height: number }

type ComponentMap = Record<string, Component>

export function xyCut(components: Component[], page: PageDim): XyNode {
  const normalizedComponents = normalize(components, page)
  const contentBounds = getRegion(normalizedComponents.map(c => c.bbox))

  const componentMap: ComponentMap
    = normalizedComponents.reduce((acc, c) => {
      return {
        ...acc,
        [c.id]: c
      }
    }, {} as ComponentMap)

  const rootNode: XyNode = {
    bbox: contentBounds,
    elems: Object.keys(componentMap)
  }
  return splitNode({
    node: rootNode,
    dict: componentMap
  })
}

function splitNode({
  node,
  dict,
  level = 0
}: {
  node: XyNode
  dict: Record<string, Component>
  level?: number
}): XyNode {
  throw Error('not implemented')
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