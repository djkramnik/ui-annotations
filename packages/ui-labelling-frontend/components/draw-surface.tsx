import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { debounce } from "../utils/debounce"

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

// this component is absolutely positioned and assumed will be child of relative or absolutely positioned parent
// an overlay with mouse events to let the user draw a rectangle
// a callback for pressing enter, which passes the dimensions of the rectangle as arguments
export const DrawSurface = ({
  handleEnter
}: {
  handleEnter: (rect: Rect) => void
}) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const isDrawing = useRef<boolean>(false)
  const drawRectangle = useRef<Rect | null>(null)
  const startPoint = useRef<{x: number; y: number} | null>(null)


  const getBox = useCallback((e: MouseEvent) => {
    if (!startPoint.current) {
      return null
    }
    const { rx, ry } = getRelativeXY(e)
    const top = Math.min(startPoint.current.y, ry)
    const left = Math.min(startPoint.current.x, rx)
    const bottom = Math.max(startPoint.current.y, ry)
    const right = Math.max(startPoint.current.x, rx)
    return {
      top,
      left,
      width: right - left,
      height: bottom - top
    }
  }, [])

  // memoizing this for static reference for adding and removing as window listener callback
  // debouncing this as it is relatively expense op that could be called many times per second
  const handleMouseMove = useCallback(() => {
    return debounce(
      function _handleMouseMove(e: MouseEvent) {
        if (!ref || !withinBounds(e) || !startPoint.current) {
          return
        }
        const { top, left, width, height } = getBox(e)

        // remove prev rectangle if any
        ref.current.querySelector('#drawRect')?.remove()
        const rect = document.createElement('div')
        rect.setAttribute('id', 'drawRect')
        ref.current.appendChild(rect)
        rect.style.position = 'absolute'
        rect.style.top = `${top}px`
        rect.style.left= `${left}px`
        rect.style.width = `${width}px`
        rect.style.height = `${height}px`
        rect.style.border = `1px solid #16F529`
        rect.style.boxSizing = 'border-box'
      },
      200 // debounce period
    )
  }, [getBox])

  useEffect(() => {
    if (isDrawing.current !== false) {
      return
    }

    window.addEventListener('mousedown', handleMouseDown)

    function handleMouseDown(e: MouseEvent) {
      if (!withinBounds(e) || drawRectangle.current !== null) {
        return
      }
      const { rx, ry } = getRelativeXY(e)
      startPoint.current = { x: rx, y: ry }
      // remove this for now
      window.removeEventListener('mousedown', handleMouseDown)

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    function handleMouseUp(e: MouseEvent) {

      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)

      window.addEventListener('mousedown', handleMouseDown)

      const { top, left, width, height } = getBox(e)

      // draw the rectangle at its final position
      ref.current.querySelector('#drawRect')?.remove()
      const rect = document.createElement('div')
      rect.setAttribute('id', 'drawRect')
      ref.current.appendChild(rect)
      rect.style.position = 'absolute'
      rect.style.top = `${top}px`
      rect.style.left= `${left}px`
      rect.style.width = `${width}px`
      rect.style.height = `${height}px`
      rect.style.border = `1px solid #16F529`
      rect.style.boxSizing = 'border-box'
      handleEnter({x: left, y: top, width, height })
    }

    // should be debounced I think

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleEnter])


  // utils

  function getRelativeXY(e: MouseEvent) {
    const { x, y } = ref.current.getBoundingClientRect()
    const rx = e.clientX - x
    const ry = e.clientY - y
    return { rx, ry }
  }

  function withinBounds(e: MouseEvent) {
    const { rx, ry } = getRelativeXY(e)
    const { width, height } = ref.current.getBoundingClientRect()
    return rx >= 0 && ry >=0 && rx <= width && ry <= height
  }

  return (
    <div ref={ref}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 2,
      }}
    />
  )
}

