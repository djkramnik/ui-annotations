// xy cut typescript implementation

// [x0, y0, x1, y1]
type Bbox = [number, number, number, number]

type XyNode = {
  bbox: Bbox
  elems: string[] // string ids
  children?: [XyNode, XyNode]
}

type Component = {
  id: string
  type: string
  bbox: Bbox // in page coordinates
}

type PageDim = { width: number, height: number }

type ComponentMap = Record<string, Component>

export function xyCut(components: Component[], page: PageDim): XyNode {
  const normalizedComponents = normalize(components, page)
  const contentBounds = getBounds(normalizedComponents.map(c => c.bbox))

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

// helpers
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x))
}

function normalize(components: Component[], page: PageDim): Component[] {
  return components.map(c => ({
    ...c,
    bbox: [
      clamp01(c.bbox[0] / page.width),
      clamp01(c.bbox[1] / page.height),
      clamp01(c.bbox[2] / page.width),
      clamp01(c.bbox[3] / page.height),
    ]
  }))
}

// given an array of bounding boxes, get the smallest box that fully encompasses them
function getBounds(bboxes: Array<Bbox>): Bbox {
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