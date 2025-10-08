import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getAnnotation, getInteractive } from "../../api";

const IMG_WIDTH = 800

// right now just a simple test to visualize the screenshot of the interactive record
export default function InteractivePage() {
  const { query } = useRouter()

  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [rect, setRect] = useState<{
    x: number; y: number; width: number; height: number} | null>(null)

  useEffect(() => {
    const recordId = Number(String(query.id))
    console.log('weird', query.boxId)
    if (Number.isNaN(recordId)) {
      return
    }
    getAnnotation(recordId)
      .then(r => {
        const {
          data : {
            viewHeight,
            viewWidth,
            payload,
            screenshot
          }
        } = r
        setScreenshot(`data:image/png;base64,${Buffer.from(r.data.screenshot).toString('base64')}`)
        const individualAnnotation = payload.annotations.find(
          a => a.id === query.boxId
        )
        if (individualAnnotation) {
          setRect(
            getScaledRect({
              rect: individualAnnotation.rect,
              ogWidth: viewWidth,
              ogHeight: viewHeight,
              imgWidth: IMG_WIDTH
            })
          )
        }

      })
  }, [query, setScreenshot, setRect])

  if (!screenshot) {
    return null
  }

  return (
    <div
      style={{
        position: 'absolute',
        width: '800px',
        height: '1200px',
        backgroundImage: `url('${screenshot}')`,
        backgroundSize: `800px auto`,
        backgroundRepeat: 'no-repeat'
      }}
    >
      {
        rect
          ? (
            <div
              style={{
                position: 'relative',
                top: rect.y + 'px',
                left: rect.x + 'px',
                width: rect.width + 'px',
                height: rect.height + 'px',
                border: `2px solid #39ff14`
              }}
            />
          )
          : null
      }
    </div>
  )
}

function getScaledRect({
  rect,
  ogWidth,
  ogHeight,
  imgWidth,
}: {
  rect: { x: number, y: number, width: number, height: number}
  ogWidth: number
  ogHeight: number
  imgWidth: number
}) {
  const imgHeight = imgWidth * (ogHeight / ogWidth)
  const sx = imgWidth / ogWidth
  const sy = imgHeight / ogHeight

  return {
    x: rect.x * sx,
    y: rect.y * sy,
    width: rect.width * sx,
    height: rect.height * sy
  }
}