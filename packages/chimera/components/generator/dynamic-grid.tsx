import {
  Annotation,
  Rect,
  ServiceManualLabel,
} from 'ui-labelling-shared'
import {
  PreviewSchema,
} from '../../util/generator'
import { useMemo, useRef, useState, useCallback } from 'react'
import { SxProps, Theme } from '@mui/material'
import { ResizableDraggable } from './draggable'
import { DynamicRegion } from './dynamic-region'

type GridItem = {
  id: number
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}

type GridRendererProps = {
  parentId: number
  parentTag?: string
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
  parentId,
  parentTag,
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

  const tagAttr = parentTag
    ? {
      'data-parent-tag': parentTag
    }
    : {}

  return (
    <div
      {...tagAttr}
      data-parent-id={parentId}
      id="synth-container"
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
