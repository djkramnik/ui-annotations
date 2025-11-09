import React, { useEffect, useRef, useState } from 'react'

export type AbsRect = { left: number; top: number; width: number; height: number }
type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const HANDLE_SIZE = 10
const MIN_W = 8
const MIN_H = 8
const DRAG_SLOP = 4 // px movement before we commit to a drag

function cursorFor(handle: Handle) {
  switch (handle) {
    case 'n': return 'ns-resize'
    case 's': return 'ns-resize'
    case 'e': return 'ew-resize'
    case 'w': return 'ew-resize'
    case 'ne': return 'nesw-resize'
    case 'sw': return 'nesw-resize'
    case 'nw': return 'nwse-resize'
    case 'se': return 'nwse-resize'
  }
}

/** Convert a pointer event's client coords to the REGION-LOCAL coords. */
function localMouse(e: React.PointerEvent<HTMLElement>) {
  const parent = (e.currentTarget.parentElement as HTMLElement) ?? (e.currentTarget as HTMLElement)
  const r = parent.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

export function ResizableDraggable({
  id,
  initial,
  onChange,
  selected,
  onSelect,
  onDelete,
  regionSize,
  zBase = 0,
  children,
  editing = false,
  onRequestEdit, // NEW: fired on double-click
}: {
  id: string
  initial: AbsRect
  onChange?: (next: AbsRect) => void
  selected: boolean
  onSelect: (id: string) => void
  onDelete?: (id: string) => void
  regionSize: { width: number; height: number }
  zBase?: number
  children: React.ReactNode
  editing?: boolean
  onRequestEdit?: (id: string) => void
}) {
  const [rect, setRect] = useState<AbsRect>(initial)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState<Handle | null>(null)

  // "maybe dragging" state until we pass slop
  const pointerDownRef = useRef(false)
  const startPt = useRef({ x: 0, y: 0 })
  const grab = useRef({ dx: 0, dy: 0 })

  const startRect = useRef<AbsRect>(initial)
  const keepAspect = useRef(false)

  useEffect(() => {
    setRect((r) => {
      if (r.left !== initial.left || r.top !== initial.top || r.width !== initial.width || r.height !== initial.height) {
        return initial
      }
      return r
    })
  }, [initial.left, initial.top, initial.width, initial.height])

  useEffect(() => { onChange?.(rect) }, [rect, onChange])

  // DRAG w/ slop
  const onPointerDownWrapper: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (editing) return
    if ((e.target as HTMLElement).dataset.handle) return
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(id)

    const { x, y } = localMouse(e)
    startPt.current = { x, y }
    grab.current = { dx: x - rect.left, dy: y - rect.top }
    pointerDownRef.current = true
    // we *don't* set dragging yet; wait for slop
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMoveWrapper: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (editing) return
    if (resizing) return

    const { x, y } = localMouse(e)

    // promote to dragging only after slop
    if (!dragging && pointerDownRef.current) {
      const dx = x - startPt.current.x
      const dy = y - startPt.current.y
      if (Math.hypot(dx, dy) >= DRAG_SLOP) {
        setDragging(true)
      } else {
        return
      }
    }

    if (!dragging) return
    const left = x - grab.current.dx
    const top = y - grab.current.dy
    setRect((r) => clampToRegion({ ...r, left, top }, regionSize))
  }

  const onPointerUpWrapper: React.PointerEventHandler<HTMLDivElement> = () => {
    pointerDownRef.current = false
    setDragging(false)
  }

  // RESIZE
  const onHandleDown = (h: Handle) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (editing) return
      if (e.button !== 0) return
      e.stopPropagation()
      onSelect(id)
      pointerDownRef.current = false
      setDragging(false)
      setResizing(h)
      keepAspect.current = e.shiftKey
      startRect.current = { ...rect }
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    }

  const onHandleMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (editing) return
    if (!resizing) return
    const { x: mx, y: my } = localMouse(e)

    setRect(() => {
      const s = startRect.current
      let left = s.left, top = s.top, width = s.width, height = s.height

      const applyAspect = (w: number, h: number, which: Handle) => {
        if (!keepAspect.current) return [w, h] as const
        const aspect = s.width / s.height || 1
        if (which === 'n' || which === 's') {
          w = Math.max(MIN_W, h * aspect)
        } else if (which === 'e' || which === 'w') {
          h = Math.max(MIN_H, w / aspect)
        } else {
          const byW = Math.abs(w - s.width) >= Math.abs(h - s.height)
          if (byW) h = Math.max(MIN_H, w / aspect)
          else w = Math.max(MIN_W, h * aspect)
        }
        return [w, h] as const
      }

      switch (resizing) {
        case 'e': {
          width = s.width + (mx - (s.left + s.width))
          ;[width, height] = applyAspect(width, height, 'e')
          break
        }
        case 'w': {
          const newLeft = mx
          width = s.width + (s.left - newLeft)
          ;[width, height] = applyAspect(width, height, 'w')
          left = s.left + (s.width - width)
          break
        }
        case 's': {
          height = s.height + (my - (s.top + s.height))
          ;[width, height] = applyAspect(width, height, 's')
          break
        }
        case 'n': {
          const newTop = my
          height = s.height + (s.top - newTop)
          ;[width, height] = applyAspect(width, height, 'n')
          top = s.top + (s.height - height)
          break
        }
        case 'se': {
          width = s.width + (mx - (s.left + s.width))
          height = s.height + (my - (s.top + s.height))
          ;[width, height] = applyAspect(width, height, 'se')
          break
        }
        case 'ne': {
          width = s.width + (mx - (s.left + s.width))
          height = s.height + (s.top - my)
          ;[width, height] = applyAspect(width, height, 'ne')
          top = s.top + (s.height - height)
          break
        }
        case 'sw': {
          width = s.width + (s.left - mx)
          height = s.height + (my - (s.top + s.height))
          ;[width, height] = applyAspect(width, height, 'sw')
          left = s.left + (s.width - width)
          break
        }
        case 'nw': {
          width = s.width + (s.left - mx)
          height = s.height + (s.top - my)
          ;[width, height] = applyAspect(width, height, 'nw')
          left = s.left + (s.width - width)
          top = s.top + (s.height - height)
          break
        }
      }

      width = Math.max(MIN_W, width)
      height = Math.max(MIN_H, height)

      return clampToRegion({ left, top, width, height }, regionSize)
    })
  }

  const onHandleUp: React.PointerEventHandler<HTMLDivElement> = () => {
    setResizing(null)
  }

  // Double-click to request edit mode
  const onDoubleClickWrapper: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (editing) return
    if (resizing || dragging) return
    e.stopPropagation()
    onRequestEdit?.(id)
  }

  // Stack: smaller items get higher base z; active on top of that
  const activeBoost = (selected || dragging || resizing) ? 10_000 : 0
  const z = zBase + activeBoost

  return (
    <>
      {/* drag surface */}
      <div
        onPointerDown={onPointerDownWrapper}
        onPointerMove={onPointerMoveWrapper}
        onPointerUp={onPointerUpWrapper}
        onDoubleClick={onDoubleClickWrapper}
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          cursor: (dragging && !resizing) ? 'grabbing' : 'grab',
          zIndex: z,
          outline: selected ? '2px solid #1976d2' : undefined,
          boxShadow: (dragging || resizing) ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
          userSelect: (dragging || resizing || editing) ? 'none' : 'auto',
          background: 'transparent',
        }}
      >
        {children}
      </div>

      {/* resize handles (only when selected and not editing) */}
      {selected && !editing && (
        <>
          {/* Delete chip */}
          <div
            onPointerDown={(e) => { e.stopPropagation(); onSelect(id) }}
            style={{
              position: 'absolute',
              left: rect.left + rect.width - 18,
              top: rect.top - 18,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: '#ef5350',
              color: 'white',
              fontSize: 12,
              lineHeight: '18px',
              textAlign: 'center',
              fontWeight: 700,
              zIndex: z + 2,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            title="Delete (Del/Backspace)"
            onClick={(e) => { e.stopPropagation(); onDelete?.(id) }}
          >
            ×
          </div>

          {(['nw','n','ne','e','se','s','sw','w'] as Handle[]).map((h) => {
            const { style } = handleStyle(h, rect)
            return (
              <div
                key={h}
                data-handle={h}
                onPointerDown={onHandleDown(h)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                style={{
                  position: 'absolute',
                  ...style,
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  background: '#1976d2',
                  border: '2px solid white',
                  borderRadius: 2,
                  cursor: cursorFor(h),
                  zIndex: z + 1,
                }}
              />
            )
          })}
        </>
      )}
    </>
  )
}

function clampToRegion(r: AbsRect, region: { width: number; height: number }): AbsRect {
  let { left, top, width, height } = r
  width = Math.max(MIN_W, Math.min(width, region.width))
  height = Math.max(MIN_H, Math.min(height, region.height))
  left = Math.min(Math.max(0, left), region.width - width)
  top = Math.min(Math.max(0, top), region.height - height)
  return { left, top, width, height }
}

function handleStyle(h: Handle, r: AbsRect) {
  const s: React.CSSProperties = {}
  const half = HANDLE_SIZE / 2
  const right = r.left + r.width
  const bottom = r.top + r.height
  switch (h) {
    case 'nw': s.left = r.left - half; s.top = r.top - half; break
    case 'n':  s.left = r.left + r.width/2 - half; s.top = r.top - half; break
    case 'ne': s.left = right - half; s.top = r.top - half; break
    case 'e':  s.left = right - half; s.top = r.top + r.height/2 - half; break
    case 'se': s.left = right - half; s.top = bottom - half; break
    case 's':  s.left = r.left + r.width/2 - half; s.top = bottom - half; break
    case 'sw': s.left = r.left - half; s.top = bottom - half; break
    case 'w':  s.left = r.left - half; s.top = r.top + r.height/2 - half; break
  }
  return { style: s }
}
