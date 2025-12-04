import { useMemo, useState } from "react";
import { Annotation, Rect, ServiceManualLabel } from "ui-labelling-shared";
import { ResizableDraggable } from "./draggable";
import { ComponentRendererType } from "../../util/generator/types";

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
  ComponentRenderer: ComponentRendererType
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
  deletedIds,
  onDeleteId,
}: {
  regionId: number
  region: { rect: Rect; components: string[] }
  annotations: Annotation[]
  scale: number
  page: { width: number; height: number }
  ComponentRenderer: ComponentRendererType
  selected: { region: number; compId: string } | null
  onSelect: (compId: string) => void
  onClear: () => void
  deletedIds: Set<string>
  onDeleteId: (id: string) => void
}) {
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

  const zBaseMap = useMemo(() => {
    const pairs = components.map((c) => ({ id: c.id, area: c.rect.width * c.rect.height }))
    pairs.sort((a, b) => a.area - b.area)
    const baseStart = 100
    return new Map(pairs.map((p, idx, arr) => [p.id, baseStart + (arr.length - idx)]))
  }, [components])

  // Which component is in text-edit mode
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <RegionCanvas regionPx={regionPx} onClearSelection={onClear}>
      {components.map((c) => {
        const abs = toLocalAbsRect(c.rect, region.rect, scale)
        const isSelected = !!selected && selected.region === regionId && selected.compId === c.id
        const zBase = zBaseMap.get(c.id) ?? 0
        const isEditing = editingId === c.id

        // normalize bulletpoints...

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
            editing={isEditing}
            onRequestEdit={() => setEditingId(c.id)} // fired on double-click
          >
            <ComponentRenderer
              page={page}
              container={region.rect}
              sx={{}}
              label={c.label as ServiceManualLabel}
              rect={c.rect}
              scale={scale}
              textContent={c.text_content ?? null}
            >
              {/* Your text child (e.g., EditableText) should NOT handle double-click itself now.
                  It just renders and reports changes. */}
              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                style={{ outline: 'none', whiteSpace: 'pre-wrap' }}
                onBlur={(e) => {
                  c.text_content = (e.currentTarget.textContent ?? '').trimEnd()
                  if (editingId === c.id) setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (!isEditing) return
                  e.stopPropagation()
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget as HTMLDivElement).blur() }
                  if (e.key === 'Escape') { e.preventDefault(); (e.currentTarget as HTMLDivElement).blur() }
                }}
                onPointerDown={(e) => {
                  // while editing, keep pointer events from bubbling to drag layer
                  if (isEditing) e.stopPropagation()
                }}
                onPaste={(e) => {
                  if (!isEditing) return
                  e.preventDefault()
                  const t = e.clipboardData.getData('text/plain')
                  document.execCommand('insertText', false, t)
                }}
              >
                {c.text_content ?? ''}
              </div>
            </ComponentRenderer>
          </ResizableDraggable>
        )
      })}
    </RegionCanvas>
  )
}
