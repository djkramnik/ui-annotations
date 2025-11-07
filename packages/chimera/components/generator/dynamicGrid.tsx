import {
  Annotation,
  Rect,
  ServiceManualLabel,
} from 'ui-labelling-shared'
import {
  estimateFontAndTrackingBox,
  estimateRegionPad,
  getAbsoluteXPositioning,
  getRegionLayoutDirection,
  PreviewSchema,
  roughlyCenteredInRegion,
  withinRect,
} from '../../util/generator'
import { Flex } from './flex'
import { useMemo } from 'react'
import { List, SxProps, Theme, useTheme } from '@mui/material'
import { DraggableFreeform } from './draggable'

type GridItem = {
  id: number
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}

type GridRendererProps = {
  data: PreviewSchema
  style?: React.CSSProperties
  className?: string
  showDebugBorders?: boolean
  maxWidth?: number
  ComponentRenderer: ({
    label,
    children,
    rect,
    page,
    sx,
    container,
    scale,
  }: {
    label: ServiceManualLabel
    children?: React.ReactNode
    rect: Rect
    page: { width: number; height: number }
    sx?: SxProps<Theme>
    container: Rect
    scale: number
  }) => React.ReactNode
}

function buildGrid({
  input,
  epsPct = 0.01,
  scale = 0.7,
}: {
  input: PreviewSchema
  epsPct?: number
  scale?: number
}): {
  container: { widthPx: number; heightPx?: number; scale: number }
  gridTemplateColumns: string
  gridTemplateRows: string
  items: GridItem[]
} {
  const { layout, contentBounds: cb, screenshot } = input
  const pageW = Math.max(1, screenshot.view_width)
  const pageH = Math.max(1, screenshot.view_height)

  const containerW = Math.round(pageW * scale)
  const epsX = epsPct * pageW
  const epsY = epsPct * pageH

  const snapPush = (arr: number[], v: number, eps: number) => {
    for (let i = 0; i < arr.length; i++) if (Math.abs(arr[i] - v) <= eps) return
    arr.push(v)
  }

  const xEdges: number[] = [0, pageW]
  const yEdges: number[] = [0, pageH]

  snapPush(xEdges, cb.x, epsX)
  snapPush(xEdges, cb.x + cb.width, epsX)
  snapPush(yEdges, cb.y, epsY)
  snapPush(yEdges, cb.y + cb.height, epsY)

  layout.forEach(({ rect: r }) => {
    snapPush(xEdges, r.x, epsX)
    snapPush(xEdges, r.x + r.width, epsX)
    snapPush(yEdges, r.y, epsY)
    snapPush(yEdges, r.y + r.height, epsY)
  })

  xEdges.sort((a, b) => a - b)
  yEdges.sort((a, b) => a - b)

  const toPxTracks = (edges: number[]) =>
    edges
      .slice(0, -1)
      .map((e, i) => Math.max(0, Math.round((edges[i + 1] - e) * scale)) + 'px')
      .join(' ')

  // new: content-flexible rows
  const toRowTracks = (edges: number[]) =>
    edges
      .slice(0, -1)
      .map((e, i) => {
        const base = Math.max(0, Math.round((edges[i + 1] - e) * scale))
        return `minmax(${base}px, auto)`
      })
      .join(' ')

  const gridTemplateColumns = toPxTracks(xEdges)
  const gridTemplateRows = toRowTracks(yEdges)

  const findIndex = (edges: number[], v: number, eps: number) => {
    let idx = edges.findIndex((e) => Math.abs(e - v) <= eps)
    if (idx === -1) {
      edges.push(v)
      edges.sort((a, b) => a - b)
      idx = edges.indexOf(v)
    }
    return idx
  }

  const items: GridItem[] = layout.map(({ rect: r }, i) => {
    const cs = findIndex(xEdges, r.x, epsX) + 1
    const ce = findIndex(xEdges, r.x + r.width, epsX) + 1
    const rs = findIndex(yEdges, r.y, epsY) + 1
    const re = findIndex(yEdges, r.y + r.height, epsY) + 1
    return { id: i, colStart: cs, colEnd: ce, rowStart: rs, rowEnd: re }
  })

  return {
    container: { widthPx: containerW, scale },
    gridTemplateColumns,
    gridTemplateRows,
    items,
  }
}


export function GridRenderer({
  data,
  style,
  className,
  showDebugBorders = false,
  ComponentRenderer,
  maxWidth = 1400
}: GridRendererProps) {
  const gridWidth = Math.min(maxWidth, data.screenshot.view_width)
  const { gridTemplateColumns, gridTemplateRows, items, container }
    = buildGrid({
        input: data,
        scale: gridWidth / data.screenshot.view_width
      })

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns,
    gridTemplateRows,
    width: container.widthPx,
    height: 'auto',
    boxSizing: 'border-box',
    border: '1px solid currentColor',
    ...style,
  }

  return (
    <div className={className} style={containerStyle}>
      {items.map((it, index) => (
        <div
          key={it.id}
          id={String(it.id)}
          style={{
            gridColumn: `${it.colStart} / ${it.colEnd}`,
            gridRow: `${it.rowStart} / ${it.rowEnd}`,
            ...(showDebugBorders
              ? { outline: '1px dashed rgba(0,0,0,0.3)' }
              : null),
          }}
        >
          <DynamicRegion
            data={data}
            id={it.id}
            ComponentRenderer={ComponentRenderer}
            scale={container.scale}
          />
        </div>
      ))}
    </div>
  )
}

function DynamicRegion({
  id,
  data,
  ComponentRenderer,
  scale,
}: {
  id: number
  scale: number
} & Pick<GridRendererProps, 'ComponentRenderer' | 'data'>) {
  const theme = useTheme()
  const region = data.layout[id]

  const page = {
    width: data.screenshot.view_width,
    height: data.screenshot.view_height,
  }
  if (!region) {
    console.error('cannot find region definition from id', id)
    return null
  }
  const componentCount = data.screenshot.annotations.filter((a) => {
    return region.components.includes(a.id)
  }).length

  const onlyChild =
    componentCount !== 1 ? null : data.screenshot.annotations[0].label

  const flow: 'row' | 'col' = useMemo(() => {
    const components = data.screenshot.annotations.filter((a) => {
      return region.components.includes(a.id)
    })
    return getRegionLayoutDirection(components.map((c) => c.rect))
  }, [data])

  const hasPageContext = data.screenshot.annotations.some(
    (a) =>
      region.components.includes(a.id) &&
      a.label === ServiceManualLabel.page_context,
  )

  const content: React.ReactNode = useMemo(() => {
    const estimatedPadding = estimateRegionPad(id, data)
    if (onlyChild === ServiceManualLabel.heading) {
      const onlyHeader = data.screenshot.annotations.find((a) => {
        return (
          region.components.includes(a.id) &&
          a.label === ServiceManualLabel.heading
        )
      })
      if (onlyHeader) {
        return getSolitaryHeader({
          region: region.rect,
          scale,
          header: onlyHeader,
          ComponentRenderer,
          page,
        })
      }
    }
    return getRegularContent({
      data,
      region,
      id,
      scale,
      page,
      ComponentRenderer,
    })
  }, [
    flow,
    data,
    id,
    ComponentRenderer,
    page,
    scale,
    hasPageContext,
    onlyChild,
    componentCount,
    theme
  ])

  return content
}

// helper: scale an annotation rect relative to its region
function toLocalAbsRect(component: Rect, region: Rect, scale: number) {
  const left = (component.x - region.x) * scale
  const top = (component.y - region.y) * scale
  const width = component.width * scale
  const height = component.height * scale
  return { left, top, width, height }
}

function RegionCanvas({
  region,
  scale,
  children,
}: {
  region: Rect
  scale: number
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: Math.max(1, Math.round(region.width * scale)),
        height: Math.max(1, Math.round(region.height * scale)),
        // Optional: pad to taste
      }}
    >
      {children}
    </div>
  )
}

function getRegularContent({
  data,
  region,
  scale,
  ComponentRenderer,
  id,
  page,
}: {
  region: (typeof data)['layout'][0]
  scale: number
  id: number
  page: { width: number; height: number }
} & Pick<GridRendererProps, 'ComponentRenderer' | 'data'>) {
  const components = data.screenshot.annotations
    .filter((a) => region.components.includes(a.id))
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)

  return (
    <RegionCanvas region={region.rect} scale={scale}>
      {components.map((c) => {
        const abs = toLocalAbsRect(c.rect, region.rect, scale)
        return (
          <DraggableFreeform key={c.id} initial={abs}>
            <ComponentRenderer
              page={page}
              container={region.rect}
              sx={{ /* no position here; Draggable handles it */ }}
              label={c.label as ServiceManualLabel}
              rect={c.rect}
              scale={scale}
            >
              {c.text_content ?? null}
            </ComponentRenderer>
          </DraggableFreeform>
        )
      })}
    </RegionCanvas>
  )
}

function getSolitaryHeader({
  header,
  region,
  scale,
  page,
  ComponentRenderer,
}: {
  region: Rect
  scale: number
  header: Annotation
  page: { width: number; height: number }
  ComponentRenderer: GridRendererProps['ComponentRenderer']
}) {
  // Start the header at its measured box; user can drag afterward.
  const abs = toLocalAbsRect(header.rect, region, scale)

  return (
    <RegionCanvas region={region} scale={scale}>
      <DraggableFreeform initial={abs}>
        <ComponentRenderer
          page={page}
          container={region}
          sx={{}}
          key={header.id}
          label={header.label as ServiceManualLabel}
          rect={header.rect}
          scale={scale}
        >
          {header.text_content ?? null}
        </ComponentRenderer>
      </DraggableFreeform>
    </RegionCanvas>
  )
}

