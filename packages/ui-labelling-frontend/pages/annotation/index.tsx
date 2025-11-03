import { useRouter } from "next/router"
import { useState, useEffect, useRef, useCallback } from "react"
import { Rect } from "ui-labelling-shared"
import { AnnotationWithScreen, getEditableAnnotations } from "../../api"
import { dataUrlToBlob, getDataUrl } from "../../utils/b64"

const AnnotationEditor = () => {
  const [batchAnnos, setBatchAnnos] = useState<null | AnnotationWithScreen[]>(null)
  const { query } = useRouter()
  const pageN = Number(String(query.page))
  const [page, setPage] = useState<number>(Number.isNaN(pageN) ? 1 : pageN)
  const [tag, setTag] = useState<string | null>(query.tag ? String(query.tag) : null)
  const [total, setTotal] = useState<number>(0)
  const [batchIndex, setBatchIndex] = useState<number>(0)

  useEffect(() => {
    let cancelled = false
    getEditableAnnotations(page)
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
  }, [page, tag, setTotal, setBatchAnnos, setBatchIndex])


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
  onRectChange, // optional callback
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

  // Mutable refs for interaction state
  const rectRef = useRef<Rect | null>(null)       // rect inside cropped canvas
  const cropOriginRef = useRef<{ sx: number; sy: number }>({ sx: 0, sy: 0 })
  const imgBitmapRef = useRef<ImageBitmap | null>(null)
  const draggingRef = useRef(false)
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

  const draw = useCallback(() => {
    const cvs = canvasRef.current
    const rect = rectRef.current
    const bitmap = imgBitmapRef.current
    if (!cvs || !rect || !bitmap) return
    const ctx = cvs.getContext("2d")
    if (!ctx) return

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0) // draw in CSS pixels
    ctx.clearRect(0, 0, cvs.width, cvs.height)
    // Draw the cropped image (already sized to canvas)
    ctx.drawImage(bitmap, 0, 0, cvs.width / DPR, cvs.height / DPR)

    // Neon rectangle
    ctx.save()
    ctx.lineWidth = 3
    ctx.strokeStyle = "#39ff14"
    ctx.shadowColor = "#39ff14"
    ctx.shadowBlur = 8
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    ctx.restore()
  }, [DPR])

  // Clamp rect so it stays fully inside the cropped canvas
  const clampRect = useCallback(
    (r: Rect) => {
      const cvs = canvasRef.current
      if (!cvs) return r
      const cw = cvs.width / DPR
      const ch = cvs.height / DPR
      const x = Math.max(0, Math.min(r.x, cw - r.width))
      const y = Math.max(0, Math.min(r.y, ch - r.height))
      return { ...r, x, y }
    },
    [DPR]
  )

  // Map from rect-in-crop back to full-screenshot coordinates
  const emitChange = useCallback(() => {
    if (!onRectChange || !rectRef.current) return
    const { sx, sy } = cropOriginRef.current
    const r = rectRef.current
    onRectChange({
      rectInCrop: { ...r },
      rectInFullImage: { x: sx + r.x, y: sy + r.y, width: r.width, height: r.height },
      cropOrigin: { sx, sy },
    })
  }, [onRectChange])

  useEffect(() => {
    let cancelled = false

    async function run() {
      const cvs = canvasRef.current
      if (!cvs) return

      // Build the source image
      const blob = dataUrlToBlob(getDataUrl(annotation.screenshot.image_data))
      const bitmap = await createImageBitmap(blob)
      if (cancelled) return

      // Compute crop window
      const { x, y, width, height } = annotation.rect
      const sx = Math.max(0, Math.floor(x - padding))
      const sy = Math.max(0, Math.floor(y - padding))
      const sw = Math.min(bitmap.width - sx, Math.ceil(width + 2 * padding))
      const sh = Math.min(bitmap.height - sy, Math.ceil(height + 2 * padding))
      cropOriginRef.current = { sx, sy }
      imgBitmapRef.current = bitmap

      // Prepare a cropped bitmap to draw each frame
      // (We slice out the crop once so draw() is cheaper)
      const cropCanvas = document.createElement("canvas")
      cropCanvas.width = sw
      cropCanvas.height = sh
      const cropCtx = cropCanvas.getContext("2d")!
      cropCtx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)
      const croppedBitmap = await createImageBitmap(cropCanvas)
      imgBitmapRef.current = croppedBitmap

      // Set canvas size (CSS vs backing store)
      cvs.style.width = `${sw}px`
      cvs.style.height = `${sh}px`
      cvs.width = Math.round(sw * DPR)
      cvs.height = Math.round(sh * DPR)

      // Initialize the draggable rect to the *original bounds inside the crop*.
      const innerRect: Rect = { x: padding, y: padding, width, height }
      rectRef.current = clampRect(innerRect)

      draw()
      emitChange()
    }

    run()
    return () => {
      cancelled = true
    }
  }, [annotation, padding, DPR, clampRect, draw, emitChange])

  // Pointer interaction
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

  // Paint the border on every render call
  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontFamily: "monospace", fontSize: 12 }}>
        <div>annotation: {annotation.id}</div>
        <div>screenshot: {annotation.screenshot.id}</div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid #333", borderRadius: 8, touchAction: "none" }}
      />
    </div>
  )
}


