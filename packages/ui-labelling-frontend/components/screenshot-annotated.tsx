import React, { useRef, useState, useLayoutEffect, CSSProperties, useEffect } from 'react'
import { annotationLabels, AnnotationPayload } from 'ui-labelling-shared'        // ← NEW
import { Rect } from '../utils/type';
import { useRouter } from 'next/router';

type Annotation  = AnnotationPayload['annotations'][0]

export default function ScreenshotAnnotator({
  screenshot,
  annotations,
  frame,
  labelOverride,
  children,
  onScaleMeasured,
  handleClick,
  labels,
}: {
  screenshot: string
  annotations: Annotation[]
  frame: { width: number; height: number }
  labelOverride?: CSSProperties
  children?: React.ReactNode
  handleClick?: (id: string) => void
  onScaleMeasured?: (scale: { x: number, y: number }) => void
  labels: Record<string, string>
}) {
  // tribe of one person knowledge
  const router = useRouter()
  const isOcr = router.query.tag === 'ocr'

  const ref = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState({ x: 1, y: 1 })

  /* ─── measure & rescale ─── */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      setScale({
        x: el.offsetWidth  / frame.width,
        y: el.offsetHeight / frame.height,
      })
    }

    update()                               // run once immediately
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [frame.width, frame.height])

  useEffect(() => {
    onScaleMeasured?.(scale)
  }, [scale, onScaleMeasured])

  /* ─── styles ─── */
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: 'auto',
    aspectRatio: `${frame.width} / ${frame.height}`,
    backgroundImage: `url(${screenshot})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top left',
    overflow: 'hidden',
  }

  /* ─── render ─── */
  return (
    <div ref={ref} style={containerStyle}>
      {annotations.map(({ id, label, rect, textContent }) => {
        const fill   = labels[label] ?? 'rgba(255,66,64,0.35)'
        // make an opaque border if the fill is rgba with alpha
        const border = fill.startsWith('rgba')
          ? fill.replace(/[\d.]+\)$/, '0.5)')
          : fill
        const handlerExists = typeof handleClick === 'function'
        return (
          <div
            onClick={handlerExists ? () => handleClick(id) : undefined}
            key={id}
            style={{
              position: 'absolute',
              left:   rect.x      * scale.x,
              top:    rect.y      * scale.y,
              width:  rect.width  * scale.x,
              height: rect.height * scale.y,
              backgroundColor: fill,
              border: `2px solid ${border}`,
              boxSizing: 'border-box',
              pointerEvents: handlerExists ? 'initial' : 'none',
              cursor: handlerExists ? 'pointer' : 'initial',
              display: 'flex',
              alignItems: 'flex-start',
              padding: '2px 4px',
              color: 'black',
              fontSize: 12,
              fontWeight: 600,
              textShadow: '0 0 2px rgba(0,0,0,.6)',
              opacity: 0.3,
              ...labelOverride
            }}
          >
            {/** I promise I will always remember ye */}
            {isOcr ? textContent : label}
          </div>
        )
      })}
      {children}
    </div>
  )
}
