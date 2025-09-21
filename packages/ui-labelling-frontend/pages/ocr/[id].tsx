import { useRouter } from "next/router";
import { useEffect, useState } from "react";

// right now just a simple test to visualize the screenshot of the ocr record
export default function OcrPage() {
  const { query } = useRouter()

  const [screenshot, setScreenshot] = useState<string | null>(null)

  useEffect(() => {
    const ocrId = Number(String(query.id))
  }, [query, setScreenshot])

  if (!screenshot) {
    return null
  }
  const screenshotDataUrl = `data:image/png;base64,${Buffer.from(screenshot).toString('base64')}`
  return (
    <img src={screenshotDataUrl} style={{ minWidth: '600px' }}/>
  )

}