import React, { useRef, useState } from 'react'

type AbsRect = { left: number; top: number; width: number; height: number }

export function DraggableFreeform({
  initial,
  children,
  onChange,
}: {
  initial: AbsRect
  children: React.ReactNode
  onChange?: (next: AbsRect) => void
}) {
  const [rect, setRect] = useState(initial)
  const [dragging, setDragging] = useState(false)
  const grab = useRef({ dx: 0, dy: 0 })

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 0) return
    setDragging(true)
    grab.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }
  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragging) return
    const left = e.clientX - grab.current.dx
    const top = e.clientY - grab.current.dy
    setRect((r) => {
      const next = { ...r, left, top }
      onChange?.(next)
      return next
    })
  }
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    setDragging(false)
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: dragging ? 'none' : 'auto',
      }}
    >
      {children}
    </div>
  )
}
