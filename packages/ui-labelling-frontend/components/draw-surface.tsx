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
  handleCandidate
}: {
  handleCandidate: (rect: Rect, ref: HTMLDivElement) => void
}) => {
  const ref = useRef<HTMLDivElement | null>(null)
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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref || !withinBounds(e) || !startPoint.current) {
      return
    }
    const { top, left, width, height } = getBox(e)

    let greenRect = ref.current.querySelector('#drawRect') as HTMLDivElement

    if (!greenRect) {
      greenRect = document.createElement('div')
      greenRect.setAttribute('id', 'drawRect')
      greenRect.style.position = 'absolute'
      greenRect.style.border = `1px solid #16F529`
      greenRect.style.boxSizing = 'border-box'
      ref.current.appendChild(greenRect)
    }

    greenRect.style.top = `${top}px`
    greenRect.style.left= `${left}px`
    greenRect.style.width = `${width}px`
    greenRect.style.height = `${height}px`

  }, [getBox])

  useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown)

    function handleMouseDown(e: MouseEvent) {
      if (!withinBounds(e)) {
        return
      }
      const { rx, ry } = getRelativeXY(e)

      // establish this as the start point
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

      // if the box is too small do nothing, just reset
      if (width < 5 || height < 5) {
        ref.current.querySelector('#drawRect')?.remove()
        return
      }

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

      // save the latest rectangle
      drawRectangle.current = { x: left, y: top, width, height }
      // remove the start point
      startPoint.current = null
      window.addEventListener('keypress', handleKeyPress)
    }

    function handleKeyPress(e: KeyboardEvent) {
      if (drawRectangle.current === null || !['Enter', 'q'].includes(e.key)) {
        return
      }
      switch(e.key) {
        case 'Enter':
          handleCandidate(drawRectangle.current, ref.current)
          break
        case 'q':
          ref.current.querySelector('#drawRect')?.remove()
          break
      }

      window.removeEventListener('keypress', handleKeyPress)

    }

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [handleCandidate])


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

