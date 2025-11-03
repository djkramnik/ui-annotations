import { useRouter } from 'next/router'
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  FormEvent,
  useMemo,
} from 'react'
import { annotationLabels, Rect, ServiceManualLabel } from 'ui-labelling-shared'
import { AnnotationWithScreen, getEditableAnnotations, patchSingleAnnotation } from '../../api'
import { dataUrlToBlob, getDataUrl } from '../../utils/b64'
import { Flex } from '../../components/flex'

const AnnotationEditor = () => {
  const [batchAnnos, setBatchAnnos] = useState<null | AnnotationWithScreen[]>(
    null,
  )
  const { query, isReady } = useRouter()
  const [total, setTotal] = useState<number>(0)
  const [batchIndex, setBatchIndex] = useState<number>(0)
  const originalRect = useRef<Rect | null>(null)
  const [updatedRect, setUpdatedRect] = useState<Rect | null>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [changes, setChanges] = useState<boolean>(false)
  const [clean, setClean] = useState<boolean>(false)
  const [text, setText] = useState<string>('')
  const [page, setPage] = useState<number>(-1)
  const [submitting, setSubmitting] = useState<boolean>(false)

  const labels: string[] = useMemo(() => {
    const tag = query.tag ? String(query.tag) : undefined
    switch (tag) {
      case 'service_manual':
        return Object.values(ServiceManualLabel)
      case 'interactive':
        return ['interactive']
      case 'textregion':
        return ['textregion']
      default:
        return Object.values(annotationLabels)
    }
  }, [query])

  const updateRect = useCallback(
    ({ rectInFullImage }: { rectInFullImage: Rect }) => {
      setUpdatedRect(rectInFullImage)
    },
    [setUpdatedRect],
  )

  const handlePrevAnno = useCallback(() => {
    setBatchIndex((bi) => Math.max(0, bi - 1))
  }, [setBatchIndex])

  const handleNextAnno = useCallback(() => {
    setBatchIndex((bi) => bi + 1)
  }, [setBatchIndex])

  const handleNextPage = useCallback(() => {
    setPage((p) => p + 1)
  }, [setPage])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      const record = batchAnnos?.[batchIndex]
      if (!record) {
        return
      }
      if (submitting) {
        return
      }
      try {
        setSubmitting(true)
        await patchSingleAnnotation(record.id, {
          label,
          text_content: text,
          clean,
          rect: updatedRect
        })
      } catch(e) {
        window.alert('failed to save annotation. WHY')
      } finally {
        setSubmitting(false)
      }
    },
    [
      clean,
      text,
      label,
      batchIndex,
      batchAnnos,
      updatedRect,
      handleNextAnno,
      setSubmitting,
      submitting
    ],
  )

  useEffect(() => {
    if (!isReady) {
      return
    }
    if (page === -1) {
      return
    }
    let cancelled = false
    const tag = query.tag ? String(query.tag) : undefined
    getEditableAnnotations(page, tag).then(({ total, records }) => {
      if (cancelled) {
        return
      }
      setTotal(total)
      setBatchAnnos(records)
      setBatchIndex(0)
      if (records.length) {
        originalRect.current = records[0].rect
      }
    })
    return () => {
      cancelled = true
    }
  }, [
    setTotal,
    setBatchAnnos,
    setBatchIndex,
    isReady,
    query,
    page,
  ])

  // set the page state on first load based on potential query
  useEffect(() => {
    const pageN = query.page ? Number(String(query.page)) : 1
    setPage(Number.isNaN(pageN) ? 1 : pageN)
  }, [query, setPage])

  const record = batchAnnos?.[batchIndex]

  useEffect(() => {
    if (!record) {
      return
    }
    console.log('world record', record)
    setLabel(record.label)
    setClean(record.clean)
    setText(record.text_content || '')
  }, [record, setLabel, setClean, setText])

  return (
    <Flex dir="column" gap="12px">
      <Flex gap="4px" aic>
        <button onClick={handlePrevAnno}>prev anno</button>
        <button onClick={handleNextAnno}>next anno</button>
        <button onClick={handleNextPage}>next page</button>
      </Flex>
      <Flex gap="4px" aic>
        <p>Page: {page}</p>
        <p>Index: {batchIndex}</p>
      </Flex>
      {record ? (
        <>
          <SingleAnnotation
            key={batchAnnos[batchIndex].id}
            annotation={batchAnnos[batchIndex]}
            onRectChange={updateRect}
          />
          <hr />
          <form onSubmit={handleSubmit}>
            <Flex dir="column" gap="8px" style={{ width: '600px' }}>
              <label htmlFor="annotation-clean">
                clean:
                <input
                  id="annotation-clean"
                  type="checkbox"
                  checked={clean}
                  onChange={(e) => setClean(e.target.checked)}
                />
              </label>
              <label htmlFor="annotation-label">
                Annotation Label:
                <select
                  id="annotation-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                >
                  {labels.map((l) => {
                    return <option value={l}>{l}</option>
                  })}
                </select>
              </label>
              <textarea rows={10} onChange={e => setText(e.target.value)} value={text} />
              <button type="submit" disabled={submitting}>submit</button>
            </Flex>
          </form>
        </>
      ) : null}
    </Flex>
  )
}

export default AnnotationEditor

function pointIn(p: { x: number; y: number }, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
}

type ResizeHandle = "nw" | "ne" | "se" | "sw"

export function SingleAnnotation({
  annotation,
  padding = 40,
  onRectChange,
}: {
  annotation: AnnotationWithScreen
  padding?: number
  onRectChange?: (args: {
    rectInCrop: Rect
    rectInFullImage: Rect
    cropOrigin: { sx: number; sy: number }
  }) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const rectRef = useRef<Rect | null>(null)
  const cropOriginRef = useRef<{ sx: number; sy: number }>({ sx: 0, sy: 0 })
  const imgBitmapRef = useRef<ImageBitmap | null>(null)

  const stepRef = useRef<number>(2) // step size (⌘ + 1..9)

  // Drag/resize state
  const modeRef = useRef<"idle" | "move" | "resize">("idle")
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const activeHandleRef = useRef<ResizeHandle | null>(null)
  const anchorRef = useRef<{ ax: number; ay: number } | null>(null)

  // HUD labels
  const hudStepRef = useRef<HTMLSpanElement | null>(null)
  const hudRectRef = useRef<HTMLSpanElement | null>(null)

  const HANDLE_SIZE = 10 // px
  const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

  const refreshHUD = useCallback(() => {
    const { sx, sy } = cropOriginRef.current
    const r = rectRef.current
    if (hudStepRef.current) hudStepRef.current.textContent = `${stepRef.current}px`
    if (hudRectRef.current && r) {
      hudRectRef.current.textContent = `x:${sx + Math.round(r.x)} y:${sy + Math.round(r.y)} w:${Math.round(
        r.width
      )} h:${Math.round(r.height)}`
    }
  }, [])

  const clampRect = useCallback(
    (r: Rect) => {
      const cvs = canvasRef.current
      if (!cvs) return r
      const cw = cvs.width / DPR
      const ch = cvs.height / DPR
      const width = Math.min(Math.max(r.width, 1), cw)
      const height = Math.min(Math.max(r.height, 1), ch)
      let x = r.x
      let y = r.y
      x = Math.max(0, Math.min(x, cw - width))
      y = Math.max(0, Math.min(y, ch - height))
      return { x, y, width, height }
    },
    [DPR]
  )

  const getHandleRects = useCallback(
    (r: Rect): Record<ResizeHandle, Rect> => {
      const hs = HANDLE_SIZE
      return {
        nw: { x: r.x - hs / 2, y: r.y - hs / 2, width: hs, height: hs },
        ne: { x: r.x + r.width - hs / 2, y: r.y - hs / 2, width: hs, height: hs },
        se: { x: r.x + r.width - hs / 2, y: r.y + r.height - hs / 2, width: hs, height: hs },
        sw: { x: r.x - hs / 2, y: r.y + r.height - hs / 2, width: hs, height: hs },
      }
    },
    [HANDLE_SIZE]
  )

  const hitTestHandle = useCallback(
    (p: { x: number; y: number }, r: Rect): ResizeHandle | null => {
      const handles = getHandleRects(r)
      for (const key of Object.keys(handles) as ResizeHandle[]) {
        if (pointIn(p, handles[key])) return key
      }
      return null
    },
    [getHandleRects]
  )

  const draw = useCallback(() => {
    const cvs = canvasRef.current
    const rect = rectRef.current
    const bitmap = imgBitmapRef.current
    if (!cvs || !rect || !bitmap) return
    const ctx = cvs.getContext("2d")
    if (!ctx) return

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, cvs.width, cvs.height)
    ctx.drawImage(bitmap, 0, 0, cvs.width / DPR, cvs.height / DPR)

    // Neon border
    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = "#39ff14"
    ctx.shadowColor = "#39ff14"
    ctx.shadowBlur = 8
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)

    // Corner handles
    const handles = getHandleRects(rect)
    ctx.fillStyle = "#39ff14"
    ctx.shadowBlur = 0
    for (const h of Object.values(handles)) {
      ctx.fillRect(h.x, h.y, h.width, h.height)
    }
    ctx.restore()

    refreshHUD()
  }, [DPR, getHandleRects, refreshHUD])

  const emitChange = useCallback(() => {
    if (!rectRef.current) return
    const { sx, sy } = cropOriginRef.current
    const r = rectRef.current
    onRectChange?.({
      rectInCrop: { ...r },
      rectInFullImage: { x: sx + r.x, y: sy + r.y, width: r.width, height: r.height },
      cropOrigin: { sx, sy },
    })
    refreshHUD()
  }, [onRectChange, refreshHUD])

  // Initialize crop + canvas + rect
  useEffect(() => {
    let cancelled = false
    async function run() {
      const cvs = canvasRef.current
      if (!cvs) return

      const blob = dataUrlToBlob(getDataUrl(annotation.screenshot.image_data))
      const bitmap = await createImageBitmap(blob)
      if (cancelled) return

      const { x, y, width, height } = annotation.rect
      const sx = Math.max(0, Math.floor(x - padding))
      const sy = Math.max(0, Math.floor(y - padding))
      const sw = Math.min(bitmap.width - sx, Math.ceil(width + 2 * padding))
      const sh = Math.min(bitmap.height - sy, Math.ceil(height + 2 * padding))
      cropOriginRef.current = { sx, sy }

      // pre-crop
      const cropCanvas = document.createElement("canvas")
      cropCanvas.width = sw
      cropCanvas.height = sh
      const cropCtx = cropCanvas.getContext("2d")!
      cropCtx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)
      const croppedBitmap = await createImageBitmap(cropCanvas)
      imgBitmapRef.current = croppedBitmap

      // canvas sizing (DPR backing)
      cvs.style.width = `${sw}px`
      cvs.style.height = `${sh}px`
      cvs.width = Math.round(sw * DPR)
      cvs.height = Math.round(sh * DPR)

      rectRef.current = clampRect({ x: padding, y: padding, width, height })
      draw()
      emitChange()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [annotation, padding, DPR, clampRect, draw, emitChange])

  // Keyboard controls (Meta + arrows/i/j/k/l; ⌘+[1..9] sets step)
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return

    const move = (dx: number, dy: number) => {
      if (!rectRef.current) return
      const next = clampRect({
        ...rectRef.current,
        x: rectRef.current.x + dx,
        y: rectRef.current.y + dy,
      })
      rectRef.current = next
      draw()
      emitChange()
    }

    // center-preserving resizes for single-axis keys
    const resizeY = (delta: number) => {
      const rect = rectRef.current
      if (!rect) return
      const ch = cvs.height / DPR
      const cy = rect.y + rect.height / 2
      const newH = Math.min(Math.max(rect.height + delta, 1), ch)
      let newY = cy - newH / 2
      if (newY < 0) newY = 0
      if (newY + newH > ch) newY = ch - newH
      rectRef.current = { ...rect, y: newY, height: newH }
      draw()
      emitChange()
    }

    const resizeX = (delta: number) => {
      const rect = rectRef.current
      if (!rect) return
      const cw = cvs.width / DPR
      const cx = rect.x + rect.width / 2
      const newW = Math.min(Math.max(rect.width + delta, 1), cw)
      let newX = cx - newW / 2
      if (newX < 0) newX = 0
      if (newX + newW > cw) newX = cw - newW
      rectRef.current = { ...rect, x: newX, width: newW }
      draw()
      emitChange()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey) return

      // step set
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault()
        stepRef.current = parseInt(e.key, 10)
        refreshHUD()
        return
      }

      const s = stepRef.current

      // arrows
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault()
        if (e.key === "ArrowLeft") move(-s, 0)
        if (e.key === "ArrowRight") move(s, 0)
        if (e.key === "ArrowUp") move(0, -s)
        if (e.key === "ArrowDown") move(0, s)
        return
      }

      // i/k/j/l resizes (center-preserving on that axis)
      switch (e.key) {
        case "i": e.preventDefault(); resizeY(+s); break   // taller
        case "k": e.preventDefault(); resizeY(-s); break   // shorter
        case "l": e.preventDefault(); resizeX(+s); break   // wider
        case "j": e.preventDefault(); resizeX(-s); break   // narrower
      }
    }

    window.addEventListener("keydown", onKeyDown, { passive: false })
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [DPR, clampRect, draw, emitChange, refreshHUD])

  // Pointer interactions: move + corner-resize + hover cursors
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return

    const toLocal = (e: PointerEvent) => {
      const bb = cvs.getBoundingClientRect()
      return { x: e.clientX - bb.left, y: e.clientY - bb.top }
    }

    const onDown = (e: PointerEvent) => {
      if (!rectRef.current) return
      const p = toLocal(e)
      const r = rectRef.current

      // handles first
      const handle = hitTestHandle(p, r)
      if (handle) {
        activeHandleRef.current = handle
        modeRef.current = "resize"
        // anchor = opposite corner (fixed)
        let ax = r.x, ay = r.y
        if (handle === "nw") { ax = r.x + r.width; ay = r.y + r.height }
        if (handle === "ne") { ax = r.x;            ay = r.y + r.height }
        if (handle === "se") { ax = r.x;            ay = r.y }
        if (handle === "sw") { ax = r.x + r.width;  ay = r.y }
        anchorRef.current = { ax, ay }
        cvs.setPointerCapture(e.pointerId)
        e.preventDefault()
        return
      }

      // move if inside rect
      if (pointIn(p, r)) {
        modeRef.current = "move"
        dragOffsetRef.current = { dx: p.x - r.x, dy: p.y - r.y }
        cvs.setPointerCapture(e.pointerId)
        e.preventDefault()
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!rectRef.current) return
      const p = toLocal(e)
      const r = rectRef.current

      if (modeRef.current === "resize" && anchorRef.current) {
        const { ax, ay } = anchorRef.current
        const cw = cvs.width / DPR, ch = cvs.height / DPR

        // clamp dragged corner to canvas
        const dx = Math.max(0, Math.min(p.x, cw))
        const dy = Math.max(0, Math.min(p.y, ch))

        // new rect from anchor to dragged corner
        let x = Math.min(ax, dx)
        let y = Math.min(ay, dy)
        let w = Math.max(1, Math.abs(dx - ax))
        let h = Math.max(1, Math.abs(dy - ay))

        rectRef.current = clampRect({ x, y, width: w, height: h })
        draw()
        return
      }

      if (modeRef.current === "move") {
        const { dx, dy } = dragOffsetRef.current
        rectRef.current = clampRect({ ...r, x: p.x - dx, y: p.y - dy })
        draw()
        return
      }

      // hover cursor when idle
      const handle = hitTestHandle(p, r)
      if (handle === "nw" || handle === "se") cvs.style.cursor = "nwse-resize"
      else if (handle === "ne" || handle === "sw") cvs.style.cursor = "nesw-resize"
      else if (pointIn(p, r)) cvs.style.cursor = "move"
      else cvs.style.cursor = "default"
    }

    const onUp = (e: PointerEvent) => {
      const wasResizing = modeRef.current === "resize"
      const wasMoving = modeRef.current === "move"
      modeRef.current = "idle"
      activeHandleRef.current = null
      anchorRef.current = null
      try { cvs.releasePointerCapture(e.pointerId) } catch {}
      if (wasResizing || wasMoving) emitChange()
    }

    cvs.addEventListener("pointerdown", onDown)
    cvs.addEventListener("pointermove", onMove)
    cvs.addEventListener("pointerup", onUp)
    cvs.addEventListener("pointercancel", onUp)
    return () => {
      cvs.removeEventListener("pointerdown", onDown)
      cvs.removeEventListener("pointermove", onMove)
      cvs.removeEventListener("pointerup", onUp)
      cvs.removeEventListener("pointercancel", onUp)
    }
  }, [DPR, clampRect, draw, emitChange, hitTestHandle])

  // Keep canvas repainted if something external triggers a render
  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontFamily: "monospace", fontSize: 12 }}>
        <div>annotation: {annotation.id}</div>
        <div>screenshot: {annotation.screenshot.id}</div>
        <div>step: <span ref={hudStepRef}>2px</span> (⌘ + 1–9)</div>
        <div>rect: <span ref={hudRectRef}>x:– y:– w:– h:–</span></div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid #333", borderRadius: 8, touchAction: "none" }}
      />
    </div>
  )
}
