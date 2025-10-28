import {
  AnnotationPayload,
  Annotations,
  ServiceManualLabel,
} from 'ui-labelling-shared'
import {
  estimateFontAndTrackingBox,
  estimateRegionPad,
  getAbsoluteXPositioning,
  getRegionLayoutDirection,
  Rect,
  roughlyCenteredInRegion,
  withinRect,
} from '../../util/generator'
import { PreviewSchema } from '../../util/localstorage'
import { Flex } from './flex'
import { useMemo } from 'react'
import { List, SxProps, Theme, useTheme } from '@mui/material'

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
  container: { widthPx: number; heightPx: number; scale: number }
  gridTemplateColumns: string
  gridTemplateRows: string
  items: GridItem[]
} {
  const { layout, contentBounds: cb, annotations } = input
  const pageW = Math.max(1, annotations.viewWidth)
  const pageH = Math.max(1, annotations.viewHeight)

  // Fixed container: half page width, preserve aspect ratio
  const containerW = Math.round(pageW * scale)

  const containerH = Math.round(pageH * scale)

  const epsX = epsPct * pageW
  const epsY = epsPct * pageH

  const snapPush = (arr: number[], v: number, eps: number) => {
    for (let i = 0; i < arr.length; i++) if (Math.abs(arr[i] - v) <= eps) return
    arr.push(v)
  }

  // Start with full-page edges (so margins are explicit grid tracks)
  const xEdges: number[] = [0, pageW]
  const yEdges: number[] = [0, pageH]

  // Also add contentBounds edges to delineate margins vs. content
  snapPush(xEdges, cb.x, epsX)
  snapPush(xEdges, cb.x + cb.width, epsX)
  snapPush(yEdges, cb.y, epsY)
  snapPush(yEdges, cb.y + cb.height, epsY)

  // Add all region edges (rects are assumed in absolute page coords)
  layout.forEach(({ rect: r }) => {
    snapPush(xEdges, r.x, epsX)
    snapPush(xEdges, r.x + r.width, epsX)
    snapPush(yEdges, r.y, epsY)
    snapPush(yEdges, r.y + r.height, epsY)
  })

  xEdges.sort((a, b) => a - b)
  yEdges.sort((a, b) => a - b)

  // Produce pixel track sizes, scaled to the fixed container
  const toPxTracks = (edges: number[]) =>
    edges
      .slice(0, -1)
      .map((e, i) => Math.max(0, Math.round((edges[i + 1] - e) * scale)) + 'px')
      .join(' ')

  const gridTemplateColumns = toPxTracks(xEdges)
  const gridTemplateRows = toPxTracks(yEdges)

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
    container: { widthPx: containerW, heightPx: containerH, scale },
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
}: GridRendererProps) {
  const { gridTemplateColumns, gridTemplateRows, items, container } = buildGrid(
    {
      input: data,
    },
  )
  console.log('scale', container.scale)
  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns,
    gridTemplateRows,
    width: container.widthPx,
    height: container.heightPx,
    boxSizing: 'border-box',
    border: '1px solid currentColor',
    ...style,
  }
  console.log('how many regions?', items.length)
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
    width: data.annotations.viewWidth,
    height: data.annotations.viewHeight,
  }
  if (!region) {
    console.error('cannot find region definition from id', id)
    return null
  }
  const componentCount = data.annotations.payload.annotations.filter((a) => {
    return region.components.includes(a.id)
  }).length

  const onlyChild =
    componentCount !== 1 ? null : data.annotations.payload.annotations[0].label

  const flow: 'row' | 'col' = useMemo(() => {
    const components = data.annotations.payload.annotations.filter((a) => {
      return region.components.includes(a.id)
    })
    return getRegionLayoutDirection(components.map((c) => c.rect))
  }, [data])

  const hasPageContext = data.annotations.payload.annotations.some(
    (a) =>
      region.components.includes(a.id) &&
      a.label === ServiceManualLabel.page_context,
  )

  const content: React.ReactNode = useMemo(() => {
    const estimatedPadding = estimateRegionPad(id, data)
    if (onlyChild === ServiceManualLabel.heading) {
      const onlyHeader = data.annotations.payload.annotations.find((a) => {
        return (
          region.components.includes(a.id) &&
          a.label === ServiceManualLabel.heading
        )
      })
      if (onlyHeader) {
        return getSolitaryHeader({
          region: region.rect,
          id,
          scale,
          header: onlyHeader,
          ComponentRenderer,
          page,
          flow,
          estimatedPadding,
          theme,
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
      hasPageContext,
      flow,
      estimatedPadding,
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

function getRegularContent({
  data,
  region,
  scale,
  ComponentRenderer,
  id,
  page,
  hasPageContext,
  flow,
  estimatedPadding,
}: {
  region: (typeof data)['layout'][0]
  scale: number
  id: number
  page: { width: number; height: number }
  hasPageContext?: boolean
  flow: 'row' | 'col'
  estimatedPadding: { top: number; left: number }
} & Pick<GridRendererProps, 'ComponentRenderer' | 'data'>) {
  const components = data.annotations.payload.annotations
    .filter((a) => {
      return region.components.includes(a.id)
    })
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)

  const bulletpoints = components.filter(
    (c) => c.label === ServiceManualLabel.bulletpoint,
  )

  // must have the same font size and letter spacing across all these bulletpoints,
  // at least within a given region ffs
  const bp = bulletpoints.find((bp) => bp.textContent)
  const bpFontInfo = bp
    ? estimateFontAndTrackingBox(bp.rect, bp.textContent!, {
        lineCount: bp.textContent!.split('\n').length,
      })
    : null
  const bpFs = bpFontInfo
    ? {
        fontSize: `${bpFontInfo.fontPx * scale}px`,
        letterSpacing: `${bpFontInfo.letterSpacingPx * scale}px`,
      }
    : null

  let sortedElems: React.ReactNode[] = []

  // evil shit going down

  const sansContext = components.filter(
    (c) => c.label !== ServiceManualLabel.page_context,
  )
  const pageCtxChildIds: string[] = hasPageContext
    ? withinRect(
        components.find((c) => c.label === ServiceManualLabel.page_context)!
          .rect,
        sansContext.map((c) => c.rect),
      ).map((idx) => sansContext[idx].id)
    : []

  let firstBulletpoint: boolean = false

  for (const c of components) {
    // hack for bulletpoints
    // we assume within a given region that there is only one actual list
    // and once we encounter a bulletpoint we mark that as the start of the list
    // and put all the bulletpoints under it
    if (c.label === ServiceManualLabel.bulletpoint) {
      if (!firstBulletpoint) {
        firstBulletpoint = true
        sortedElems.push(
          <List sx={{ pl: 2 }}>
            {bulletpoints.map((bp) => {
              return (
                <ComponentRenderer
                  scale={scale}
                  container={data.layout[id].rect}
                  rect={bp.rect}
                  page={page}
                  label={ServiceManualLabel.bulletpoint}
                  key={bp.id}
                  sx={{
                    padding: 0,
                    ...(bpFs ?? {}),
                  }}
                >
                  {bp.textContent}
                </ComponentRenderer>
              )
            })}
          </List>,
        )
      }
      continue // except for the first bulletpoint where we do everything, skip
    }

    if (pageCtxChildIds.includes(c.id)) {
      continue // these will be handled once when we get to the page_context component
    }

    if (c.label === ServiceManualLabel.page_context) {
      const pageCtxChildren = pageCtxChildIds.map(
        (id) => components.find((c) => c.id === id)!,
      )

      const positions = getAbsoluteXPositioning({
        region: region.rect,
        components: pageCtxChildren.map((c) => c.rect),
        scale,
      })

      const tallestH =
        Math.max(...pageCtxChildren.map((c) => c.rect.height)) * scale
      sortedElems.push(
        /** make as tall as tallest element of pageCtxChildren */
        <div
          style={{
            position: 'relative',
            height: `${tallestH}px`,
            width: '100%',
            margin: `${tallestH / 2}px 0`,
          }}
        >
          {pageCtxChildren.map((c, idx) => {
            const perhapsBold =
              c.label === ServiceManualLabel.heading && Math.random() > 0.7
            return (
              <ComponentRenderer
                page={page}
                container={data.layout[id].rect}
                sx={{
                  position: 'absolute',
                  left: positions.find((p) => p.id === idx)!.left + 'px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  ...(perhapsBold
                    ? {
                        fontWeight: 'bold !important',
                      }
                    : undefined),
                }}
                key={c.id}
                label={c.label as ServiceManualLabel}
                rect={c.rect}
                scale={scale}
              >
                {c.textContent ?? null}
              </ComponentRenderer>
            )
          })}
        </div>,
      )
      continue
    }

    const maybeBold =
      c.label === ServiceManualLabel.heading && Math.random() > 0.7

    const cr = data.layout[id].rect
    const absPos = c.label === ServiceManualLabel.diagram_number
      ? {
        position: 'absolute',
        top: `${(c.rect.y - cr.y) * scale}px`,
        left: `${(c.rect.x - cr.x) * scale}px`,
        zIndex: 1
      }
      : null

    sortedElems.push(
      <ComponentRenderer
        page={page}
        container={data.layout[id].rect}
        sx={{
          ...(absPos ?? {}),
          ...(maybeBold
            ? {
                fontWeight: 'bold !important',
              }
            : undefined),
        }}
        key={c.id}
        label={c.label as ServiceManualLabel}
        rect={c.rect}
        scale={scale}
      >
        {c.textContent ?? null}
      </ComponentRenderer>,
    )
  }

  const padStyle = {
    paddingLeft: `${Math.floor(estimatedPadding.left * scale)}px`,
    paddingTop: `${Math.floor(estimatedPadding.top * scale)}px`,
  }

  const flexProps =
    flow === 'row'
      ? {
          wrap: true,
          jcsb: true,
          aic: true,
        }
      : {
          col: true,
        }

  return (
    <Flex
      {...flexProps}
      style={{
        position: 'relative', // important because we will sometimes abs pos children
        ...padStyle,
        gap: '4px',
      }}
    >
      {sortedElems}
    </Flex>
  )
}

function getSolitaryHeader({
  header,
  region,
  id,
  scale,
  page,
  ComponentRenderer,
  estimatedPadding,
  flow,
  theme
}: {
  region: Rect
  id: number
  scale: number
  header: AnnotationPayload['annotations'][0]
  page: { width: number; height: number }
  ComponentRenderer: GridRendererProps['ComponentRenderer']
  estimatedPadding: { top: number; left: number }
  flow: 'row' | 'col'
  theme: Theme
}) {

  if (id === 0) {
    const roughlyCentered = roughlyCenteredInRegion({
      container: region,
      component: header.rect,
      tol: 0.15
    })
    const maybeBold = Math.random() > 0.2
    return (
      <Flex
        aic
        jcc={roughlyCentered}
        style={{

        }}
      >
        <ComponentRenderer
          page={page}
          container={region}
          sx={{
            backgroundColor: theme.palette.primary.main,
            ...(maybeBold
              ? {
                  fontWeight: 'bold !important',
                }
              : undefined),
          }}
          key={header.id}
          label={header.label as ServiceManualLabel}
          rect={header.rect}
          scale={scale}
        >
          {header.textContent ?? null}
        </ComponentRenderer>
      </Flex>
    )
  }

  const maybeCentered = ServiceManualLabel.heading ? Math.random() > 0.5 : false

  const padStyle = {
    paddingLeft: `${Math.floor(estimatedPadding.left * scale)}px`,
    paddingTop: `${Math.floor(estimatedPadding.top * scale)}px`,
  }

  const flexProps =
    flow === 'row'
      ? {
          wrap: true,
          jcsb: true,
          aic: true,
        }
      : {
          col: true,
        }

  // the further down the page you get the less likely to be bold
  const maybeBold = Math.random() > Math.min(0.95, id / 10 + 0.1)
  return (
    <Flex
      {...flexProps}
      style={{
        position: 'relative', // important because we will sometimes abs pos children
        ...padStyle,
        gap: '4px',
        ...(maybeCentered ? { justifyContent: 'center ' } : undefined),
      }}
    >
      <ComponentRenderer
        page={page}
        container={region}
        sx={{
          ...(maybeBold
            ? {
                fontWeight: 'bold !important',
              }
            : undefined),
        }}
        key={header.id}
        label={header.label as ServiceManualLabel}
        rect={header.rect}
        scale={scale}
      >
        {header.textContent ?? null}
      </ComponentRenderer>
    </Flex>
  )
}
