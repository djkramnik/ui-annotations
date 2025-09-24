import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getInteractive } from "../../api";

// right now just a simple test to visualize the screenshot of the interactive record
export default function InteractivePage() {
  const { query } = useRouter()

  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    const recordId = Number(String(query.id))
    if (Number.isNaN(recordId)) {
      return
    }
    getInteractive(recordId)
      .then(r => {
        setScreenshot(`data:image/png;base64,${Buffer.from(r.screenshot).toString('base64')}`)
        setLabel(r.label)
      })
  }, [query, setScreenshot, setLabel])

  if (!screenshot) {
    return null
  }

  return (
    <>
      <img src={screenshot} style={{ minWidth: '600px', border: `1px solid #333` }}/>
      <p>{label || 'UNLABELLED'}</p>
    </>
  )

}