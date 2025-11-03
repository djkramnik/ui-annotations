import { useRouter } from "next/router"
import { useState, useEffect, useRef, useCallback } from "react"
import { Rect } from "ui-labelling-shared"
import { AnnotationWithScreen, getEditableAnnotations } from "../../api"
import { dataUrlToBlob, getDataUrl } from "../../utils/b64"

const AnnotationEditor = () => {
  const [batchAnnos, setBatchAnnos] = useState<null | AnnotationWithScreen[]>(null)
  const { query, isReady } = useRouter()
  const [total, setTotal] = useState<number>(0)
  const [batchIndex, setBatchIndex] = useState<number>(0)

  useEffect(() => {
    if (!isReady) {
      return
    }
    let cancelled = false
    const tag = query.tag ? String(query.tag) : undefined
    const pageN = Number(String(query.page))
    getEditableAnnotations(Number.isNaN(pageN) ? 1 : pageN, tag)
      .then(({ total, records }) => {
        if (cancelled) {
          return
        }
        setTotal(total)
        setBatchAnnos(records)
        setBatchIndex(0)
      })
    return () => {
      cancelled = true
    }
  }, [setTotal, setBatchAnnos, setBatchIndex, isReady, query])


  if (!batchAnnos) {
    return null
  }

  return (
    <SingleAnnotation
      key={batchAnnos[batchIndex].id}
      annotation={batchAnnos[batchIndex]}
    />
  )

}

export default AnnotationEditor

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
  const draggingRef = useRef(false)
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const stepRef = useRef<number>(2) // <- px size, default 2

  const hudStepRef = useRef<HTMLSpanElement | null>(null)
  const hudRectRef = useRef<HTMLSpanElement | null>(null)

  const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

  const refreshHUD = useCallback(() => {
    const r = rectRef.current
    if (hudStepRef.current) {
      hudStepRef.current.textContent = `${stepRef.current}px`
    }
    if (hudRectRef.current && r) {
      hudRectRef.current.textContent = `x:${Math.round(r.x)} y:${Math.round(r.y)} w:${Math.round(r.width)} h:${Math.round(r.height)}`
    }
  }, [])

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

    ctx.save()
    ctx.lineWidth = 1
    ctx.strokeStyle = "#39ff14"
    ctx.shadowColor = "#39ff14"
    ctx.shadowBlur = 8
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    ctx.restore()
  }, [DPR])

  const clampRect = useCallback(
    (r: Rect) => {
      const cvs = canvasRef.current
      if (!cvs) return r
      const cw = cvs.width / DPR
      const ch = cvs.height / DPR
      const width = Math.min(r.width, cw)
      const height = Math.min(r.height, ch)
      let x = r.x
      let y = r.y
      x = Math.max(0, Math.min(x, cw - width))
      y = Math.max(0, Math.min(y, ch - height))
      return { x, y, width, height }
    },
    [DPR]
  )

  const emitChange = useCallback(() => {
    if (!rectRef.current) return
    console.log('hello')
    const { sx, sy } = cropOriginRef.current
    const r = rectRef.current
    onRectChange?.({
      rectInCrop: { ...r },
      rectInFullImage: { x: sx + r.x, y: sy + r.y, width: r.width, height: r.height },
      cropOrigin: { sx, sy },
    })
    refreshHUD()
  }, [onRectChange, refreshHUD])

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

      // Pre-crop for cheap redraws
      const cropCanvas = document.createElement("canvas")
      cropCanvas.width = sw
      cropCanvas.height = sh
      const cropCtx = cropCanvas.getContext("2d")!
      cropCtx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)
      const croppedBitmap = await createImageBitmap(cropCanvas)
      imgBitmapRef.current = croppedBitmap

      // Size canvas with HiDPI backing
      cvs.style.width = `${sw}px`
      cvs.style.height = `${sh}px`
      cvs.width = Math.round(sw * DPR)
      cvs.height = Math.round(sh * DPR)

      // Rect begins at original bounds inside crop (offset by padding)
      rectRef.current = clampRect({ x: padding, y: padding, width, height })
      draw()
      emitChange()
    }

    run()
    return () => {
      cancelled = true
    }
  }, [annotation, padding, DPR, clampRect, draw, emitChange])

  // ----- Keyboard controls (Meta + key) -----
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return

    const getCanvasSize = () => {
      const cw = cvs.width / DPR
      const ch = cvs.height / DPR
      return { cw, ch }
    }

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

    const resizeY = (delta: number) => {
      const rect = rectRef.current
      const cvs = canvasRef.current
      if (!rect || !cvs) return
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
      const cvs = canvasRef.current
      if (!rect || !cvs) return
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

      // Toggle step: ⌘ + [1..9]
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault()
        stepRef.current = parseInt(e.key, 10)
        refreshHUD()
        return
      }

      // Movement with arrows
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault()
        const s = stepRef.current
        if (e.key === "ArrowLeft") move(-s, 0)
        if (e.key === "ArrowRight") move(s, 0)
        if (e.key === "ArrowUp") move(0, -s)
        if (e.key === "ArrowDown") move(0, s)
        return
      }

      // Resize edges
      const s = stepRef.current
      switch (e.key) {
        case "i": // taller
          e.preventDefault()
          resizeY(s)
          break
        case "k": // shorter
          e.preventDefault()
          resizeY(-s)
          break
        case "l": // wider
          e.preventDefault()
          resizeX(s)
          break
        case "j": // narrower
          e.preventDefault()
          resizeX(-s)
          break
      }
    }

    window.addEventListener("keydown", onKeyDown, { passive: false })
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [DPR, clampRect, draw, emitChange, refreshHUD])

  // ----- Pointer dragging -----
  useEffect(() => {
    const cvs = canvasRef.current
    if (!cvs) return

    const toLocal = (e: PointerEvent) => {
      const bb = cvs.getBoundingClientRect()
      const x = e.clientX - bb.left
      const y = e.clientY - bb.top
      return { x, y }
    }

    const onDown = (e: PointerEvent) => {
      if (!rectRef.current) return
      const p = toLocal(e)
      const r = rectRef.current
      const inside = p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
      if (inside) {
        draggingRef.current = true
        dragOffsetRef.current = { dx: p.x - r.x, dy: p.y - r.y }
        cvs.setPointerCapture(e.pointerId)
        e.preventDefault()
      }
    }

    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !rectRef.current) return
      const p = toLocal(e)
      const { dx, dy } = dragOffsetRef.current
      const next = clampRect({ ...rectRef.current, x: p.x - dx, y: p.y - dy })
      rectRef.current = next
      draw()
    }

    const onUp = (e: PointerEvent) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      cvs.releasePointerCapture(e.pointerId)
      emitChange()
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
  }, [clampRect, draw, emitChange])

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

