import { SxProps, Theme } from "@mui/material";
import { useMemo } from "react";
import { Annotation, Rect, ServiceManualLabel } from "ui-labelling-shared";
import { ResizableDraggable } from "./draggable";


export function DynamicRegion({
  id,
  data,
  ComponentRenderer,
  scale,
  selected,
  onSelect,
  onClear,
  deletedIds,
  onDeleteId,
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
  const page = useMemo(
    () => ({ width: data.screenshot.view_width, height: data.screenshot.view_height }),
    [data.screenshot.view_width, data.screenshot.view_height]
  )

  if (!region) {
    return null
  }

  return (
    <RegionContent
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


// Convert page rect → region-local px (scaled)
function toLocalAbsRect(component: Rect, region: Rect, scale: number) {
  const left = (component.x - region.x) * scale
  const top = (component.y - region.y) * scale
  const width = component.width * scale
  const height = component.height * scale
  return { left, top, width, height }
}

function RegionCanvas({
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

function RegionContent({
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
