import React, { useRef, useState, useLayoutEffect } from 'react'
import { annotationLabels } from 'ui-labelling-shared'        // ← NEW

type Rect = { x: number; y: number; width: number; height: number }
type Ann  = { id: string; label: string; rect: Rect }

interface Props {
  screenshot: string                      // data:image/png;base64,...
  annotations: Ann[]                      // payload.annotations
  frame: { width: number; height: number } // capture size (1019 × 673, etc.)
}

export default function ScreenshotAnnotator({ screenshot, annotations, frame }: Props) {
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
      {annotations.map(({ id, label, rect }) => {
        const fill   = annotationLabels[label] ?? 'rgba(255,66,64,0.35)'
        // make an opaque border if the fill is rgba with alpha
        const border = fill.startsWith('rgba')
          ? fill.replace(/[\d.]+\)$/, '1)')
          : fill

        return (
          <div
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
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              padding: '2px 4px',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              textShadow: '0 0 2px rgba(0,0,0,.6)',
            }}
          >
            {label}
          </div>
        )
      })}
    </div>
  )
}
