// ResizableDraggable.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'

export type AbsRect = { left: number; top: number; width: number; height: number }
type Handle =
  | 'n' | 's' | 'e' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw'

const HANDLE_SIZE = 10
const MIN_W = 8
const MIN_H = 8

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

export function ResizableDraggable({
  id,
  initial,
  onChange,
  selected,
  onSelect,
  regionSize,
  children,
}: {
  id: string
  initial: AbsRect
  onChange?: (next: AbsRect) => void
  selected: boolean
  onSelect: (id: string) => void
  regionSize: { width: number; height: number } // canvas size (px)
  children: React.ReactNode
}) {
  const [rect, setRect] = useState<AbsRect>(initial)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState<Handle | null>(null)
  const grab = useRef({ dx: 0, dy: 0 })
  const startRect = useRef<AbsRect>(initial)
  const keepAspect = useRef(false)

  // update external when rect changes
  useEffect(() => { onChange?.(rect) }, [rect])

  // click select
  const onPointerDownWrapper: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if ((e.target as HTMLElement).dataset.handle) return // let handle handler run
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(id)
    setResizing(null)
    setDragging(true)
    grab.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMoveWrapper: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (resizing) return // handled elsewhere
    if (!dragging) return
    const left = e.clientX - grab.current.dx
    const top = e.clientY - grab.current.dy
    setRect((r) => clampToRegion({ ...r, left, top }, regionSize))
  }

  const onPointerUpWrapper: React.PointerEventHandler<HTMLDivElement> = () => {
    setDragging(false)
  }

  // handles
  const onHandleDown = (h: Handle) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.stopPropagation()
      onSelect(id)
      setDragging(false)
      setResizing(h)
      keepAspect.current = e.shiftKey
      startRect.current = { ...rect }
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    }

  const onHandleMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!resizing) return
    const dx = e.clientX - (startRect.current.left + startRect.current.width)
    const dy = e.clientY - (startRect.current.top + startRect.current.height)
    const { clientX, clientY } = e

    setRect(() => {
      const s = startRect.current
      let left = s.left, top = s.top, width = s.width, height = s.height

      const x = clientX - grab.current.dx // not used; we’ll compute deltas vs start rect
      const y = clientY - grab.current.dy

      const mx = clientX
      const my = clientY

      // Convert pointer to local deltas relative to start edges
      const deltaX = mx - (s.left + s.width)
      const deltaY = my - (s.top + s.height)

      const deltaXLeft = mx - s.left
      const deltaYTop = my - s.top

      const applyAspect = (w: number, h: number, which: Handle) => {
        if (!keepAspect.current) return [w, h] as const
        const aspect = s.width / s.height || 1
        if (which === 'n' || which === 's') {
          // vertical drag → adjust width to preserve aspect
          w = Math.max(MIN_W, h * aspect)
        } else if (which === 'e' || which === 'w') {
          h = Math.max(MIN_H, w / aspect)
        } else {
          // corner: use larger of |dw|, |dh| to scale consistently
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

  // Keep wrapper on top when active
  const z = selected || dragging || resizing ? 10 : 1

  return (
    <>
      {/* drag surface */}
      <div
        onPointerDown={onPointerDownWrapper}
        onPointerMove={onPointerMoveWrapper}
        onPointerUp={onPointerUpWrapper}
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
          userSelect: (dragging || resizing) ? 'none' : 'auto',
          background: 'transparent',
        }}
      >
        {children}
      </div>

      {/* resize handles (only when selected) */}
      {selected && (
        <>
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
  // clamp size first
  width = Math.max(MIN_W, Math.min(width, region.width))
  height = Math.max(MIN_H, Math.min(height, region.height))
  // clamp position so box stays inside
  left = Math.min(Math.max(0, left), region.width - width)
  top = Math.min(Math.max(0, top), region.height - height)
  return { left, top, width, height }
}

function handleStyle(h: Handle, r: AbsRect) {
  const s: React.CSSProperties = {}
  const half = HANDLE_SIZE / 2
  const right = r.left + r.width
  const bottom = r.top + r.height
  // convert to local absolute positions:
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
  // since these handles are siblings, we actually place them
  // using absolute coords relative to the region (not the item),
  // so caller renders them in the same stacking context.
  return { style: s }
}
