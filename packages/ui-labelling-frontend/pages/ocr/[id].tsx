import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getOcr } from "../../api";

// right now just a simple test to visualize the screenshot of the ocr record
export default function OcrPage() {
  const { query } = useRouter()

  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    const ocrId = Number(String(query.id))
    if (Number.isNaN(ocrId)) {
      return
    }
    getOcr(ocrId)
      .then(r => {
        setScreenshot(`data:image/png;base64,${Buffer.from(r.screenshot).toString('base64')}`)
        setText(r.text)
      })
  }, [query, setScreenshot, setText])

  if (!screenshot) {
    return null
  }

  return (
    <>
      <img src={screenshot} style={{ minWidth: '600px', border: `1px solid #333` }}/>
      <p>{text}</p>
    </>
  )

}