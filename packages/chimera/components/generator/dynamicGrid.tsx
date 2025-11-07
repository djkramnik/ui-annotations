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
import { useMemo, useRef, useState, useCallback } from 'react'
import { SxProps, Theme } from '@mui/material'
import { ResizableDraggable } from './draggable'

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

type Selection = { region: number; compId: string } | null

export function GridRenderer({
  data,
  style,
  className,
  showDebugBorders = false,
  ComponentRenderer,
  maxWidth = 1400,
}: GridRendererProps) {
  // Track deletions locally (non-destructive to source data)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [selection, setSelection] = useState<Selection>(null)

  const gridWidth = Math.min(maxWidth, data.screenshot.view_width)
  const { gridTemplateColumns, gridTemplateRows, items, container } = buildGrid({
    input: data,
    scale: gridWidth / data.screenshot.view_width,
  })

  const containerRef = useRef<HTMLDivElement>(null)

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns,
    gridTemplateRows,
    width: container.widthPx,
    height: 'auto',
    boxSizing: 'border-box',
    border: '1px solid currentColor',
    position: 'relative',
    ...style,
  }

  const clearAll = () => setSelection(null)

  const deleteSelected = useCallback(() => {
    if (!selection) return
    setDeletedIds((prev) => {
      const next = new Set(prev)
      next.add(selection.compId)
      return next
    })
    setSelection(null)
  }, [selection])

  // Keyboard support for Delete/Backspace
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selection) {
        e.preventDefault()
        deleteSelected()
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onPointerDown={(e) => {
        if (e.currentTarget === e.target) clearAll()
      }}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {items.map((it) => (
        <div
          key={it.id}
          id={String(it.id)}
          style={{
            gridColumn: `${it.colStart} / ${it.colEnd}`,
            gridRow: `${it.rowStart} / ${it.rowEnd}`,
            ...(showDebugBorders ? { outline: '1px dashed rgba(0,0,0,0.3)' } : null),
            position: 'relative',
          }}
          onPointerDown={(e) => {
            if (e.currentTarget === e.target) clearAll()
          }}
        >
          <DynamicRegion
            id={it.id}
            data={data}
            ComponentRenderer={ComponentRenderer}
            scale={container.scale}
            selected={selection}
            onSelect={(compId) => setSelection({ region: it.id, compId })}
            onClear={() => clearAll()}
            deletedIds={deletedIds}                 // NEW
            onDeleteId={(id) => {                   // NEW
              setDeletedIds((prev) => new Set(prev).add(id))
              setSelection(null)
            }}
          />
        </div>
      ))}
    </div>
  )
}

// Convert page rect → region-local px (scaled)
function toLocalAbsRect(component: Rect, region: Rect, scale: number) {
  const left = (component.x - region.x) * scale
  const top = (component.y - region.y) * scale
  const width = component.width * scale
  const height = component.height * scale
  return { left, top, width, height }
}

export function RegionCanvas({
  regionPx,
  onClearSelection,
  children,
  style,
}: {
  regionPx: { width: number; height: number }
  onClearSelection?: () => void
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{ position: 'relative', width: regionPx.width, height: regionPx.height, ...style }}
      onPointerDown={(e) => {
        if (e.currentTarget === e.target) onClearSelection?.()
      }}
    >
      {children}
    </div>
  )
}

export function RegularRegionContent({
  regionId,
  region,
  annotations,
  scale,
  page,
  ComponentRenderer,
  selected,
  onSelect,
  onClear,
  deletedIds,           // NEW
  onDeleteId,           // NEW
}: {
  regionId: number
  region: { rect: Rect; components: string[] }
  annotations: Annotation[]
  scale: number
  page: { width: number; height: number }
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
  selected: { region: number; compId: string } | null
  onSelect: (compId: string) => void
  onClear: () => void
  deletedIds: Set<string>
  onDeleteId: (id: string) => void
}) {
  // filter by region and not-deleted
  const components = useMemo(
    () =>
      annotations
        .filter((a) => region.components.includes(a.id) && !deletedIds.has(a.id))
        .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x),
    [annotations, region.components, deletedIds]
  )

  const regionPx = useMemo(
    () => ({
      width: Math.round(region.rect.width * scale),
      height: Math.round(region.rect.height * scale),
    }),
    [region.rect.width, region.rect.height, scale]
  )

  // z-index scheme: smaller area → higher zBase
  const zBaseMap = useMemo(() => {
    const pairs = components.map((c) => ({ id: c.id, area: c.rect.width * c.rect.height }))
    pairs.sort((a, b) => a.area - b.area) // ascending: smallest first
    // give smallest the highest base z
    const baseStart = 100 // region-local base to avoid ties across regions
    return new Map(pairs.map((p, idx, arr) => [p.id, baseStart + (arr.length - idx)]))
  }, [components])

  return (
    <RegionCanvas regionPx={regionPx} onClearSelection={onClear}>
      {components.map((c) => {
        const abs = toLocalAbsRect(c.rect, region.rect, scale)
        const isSelected = !!selected && selected.region === regionId && selected.compId === c.id
        const zBase = zBaseMap.get(c.id) ?? 0
        return (
          <ResizableDraggable
            key={c.id}
            id={c.id}
            initial={abs}
            selected={isSelected}
            onSelect={onSelect}
            onDelete={onDeleteId}
            regionSize={regionPx}
            zBase={zBase}
          >
            <ComponentRenderer
              page={page}
              container={region.rect}
              sx={{}}
              label={c.label as ServiceManualLabel}
              rect={c.rect}
              scale={scale}
            >
              {c.text_content ?? null}
            </ComponentRenderer>
          </ResizableDraggable>
        )
      })}
    </RegionCanvas>
  )
}

export function SolitaryHeaderRegionContent({
  regionId,
  header,
  region,
  scale,
  page,
  ComponentRenderer,
  selected,
  onSelect,
  onClear,
  deletedIds,         // NEW
  onDeleteId,         // NEW
}: {
  regionId: number
  header: Annotation
  region: Rect
  scale: number
  page: { width: number; height: number }
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
  selected: { region: number; compId: string } | null
  onSelect: (compId: string) => void
  onClear: () => void
  deletedIds: Set<string>
  onDeleteId: (id: string) => void
}) {
  if (deletedIds.has(header.id)) return null

  const regionPx = useMemo(
    () => ({ width: Math.round(region.width * scale), height: Math.round(region.height * scale) }),
    [region.width, region.height, scale]
  )
  const abs = useMemo(() => toLocalAbsRect(header.rect, region, scale), [header.rect, region, scale])
  const isSelected = !!selected && selected.region === regionId && selected.compId === header.id

  // single header: still give it a base z
  const zBase = 100 + 1

  return (
    <RegionCanvas regionPx={regionPx} onClearSelection={onClear}>
      <ResizableDraggable
        id={header.id}
        initial={abs}
        selected={isSelected}
        onSelect={onSelect}
        onDelete={onDeleteId}
        regionSize={regionPx}
        zBase={zBase}
      >
        <ComponentRenderer
          page={page}
          container={region}
          sx={{}}
          label={header.label as ServiceManualLabel}
          rect={header.rect}
          scale={scale}
        >
          {header.text_content ?? null}
        </ComponentRenderer>
      </ResizableDraggable>
    </RegionCanvas>
  )
}

export function DynamicRegion({
  id,
  data,
  ComponentRenderer,
  scale,
  selected,
  onSelect,
  onClear,
  deletedIds,             // NEW
  onDeleteId,             // NEW
}: {
  id: number
  scale: number
  data: {
    layout: Array<{ rect: Rect; components: string[] }>
    screenshot: { view_width: number; view_height: number; annotations: Annotation[] }
  }
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
  selected: { region: number; compId: string } | null
  onSelect: (compId: string) => void
  onClear: () => void
  deletedIds: Set<string>
  onDeleteId: (id: string) => void
}) {
  const region = data.layout[id]
  if (!region) return null

  const page = useMemo(
    () => ({ width: data.screenshot.view_width, height: data.screenshot.view_height }),
    [data.screenshot.view_width, data.screenshot.view_height]
  )

  const componentsInRegion = useMemo(
    () =>
      data.screenshot.annotations
        .filter((a) => region.components.includes(a.id))
        .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x),
    [data.screenshot.annotations, region.components]
  )

  const solitaryHeader =
    componentsInRegion.length === 1 &&
    (componentsInRegion[0].label as ServiceManualLabel) === 'heading'
      ? componentsInRegion[0]
      : null

  return solitaryHeader ? (
    <SolitaryHeaderRegionContent
      regionId={id}
      header={solitaryHeader}
      region={region.rect}
      scale={scale}
      page={page}
      ComponentRenderer={ComponentRenderer}
      selected={selected}
      onSelect={onSelect}
      onClear={onClear}
      deletedIds={deletedIds}
      onDeleteId={onDeleteId}
    />
  ) : (
    <RegularRegionContent
      regionId={id}
      region={region}
      annotations={data.screenshot.annotations}
      scale={scale}
      page={page}
      ComponentRenderer={ComponentRenderer}
      selected={selected}
      onSelect={onSelect}
      onClear={onClear}
      deletedIds={deletedIds}
      onDeleteId={onDeleteId}
    />
  )
}
