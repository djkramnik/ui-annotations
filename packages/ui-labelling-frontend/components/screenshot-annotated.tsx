// ScreenshotAnnotator.tsx
import React, { useRef, useState, useLayoutEffect } from 'react';

type Rect = { x: number; y: number; width: number; height: number };
type Ann  = { id: string; label: string; rect: Rect };

interface Props {
  screenshot: string;                     // data:image/png;base64,...
  annotations: Ann[];                     // payload.annotations
  frame: { width: number; height: number };// capture size (1019 × 673 in example)
}

// quick palette – adjust / add per-label if you like
const colour = {
  link:    'rgba(17,107,255,.35)',
  default: 'rgba(255,66,64,.35)',
};

export default function ScreenshotAnnotator({ screenshot, annotations, frame }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });

  /* ──────────────────── measure & rescale ─────────────────── */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      // actual pixels on screen vs. capture size
      setScale({
        x: el.offsetWidth  / frame.width,
        y: el.offsetHeight / frame.height,
      });
    };

    update();                         // run once immediately
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame.width, frame.height]);

  /* ──────────────────── styles ─────────────────── */
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',                   // fluid – parent defines width
    height: 'auto',
    aspectRatio: `${frame.width} / ${frame.height}`, // keeps aspect
    backgroundImage: `url(${screenshot})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'top left',
    overflow: 'hidden',
  };

  /* ──────────────────── render ─────────────────── */
  return (
    <div ref={ref} style={containerStyle}>
      {annotations.map(({ id, label, rect }) => {
        const fill   = colour[label] ?? colour.default;
        const border = fill.replace(/0\.35\)$/, '1)');

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
        );
      })}
    </div>
  );
}
