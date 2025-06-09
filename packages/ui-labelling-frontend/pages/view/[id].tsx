import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { toBase64 } from '../../utils/base64'

interface Annotation {
  url: string
  payload: { window: { width: number; height: number } }
  screenshot: { data: ArrayBuffer }
}

export default function AnnotationPage() {
  const { query, push, isReady } = useRouter()
  const [annotation, setAnnotation] = useState<Annotation | null>(null)

  useEffect(() => {
    if (!isReady) return
    fetch(`/api/annotation/${query.id}`)
      .then(r => r.json())
      .then(({ data }) => setAnnotation(data))
      .catch(console.error)
  }, [isReady, query.id])

  if (!annotation) return <p>Loading…</p>

  const {
    url,
    payload: { window: win },
    screenshot,
  } = annotation

  return (
    <main id="annotation-view">
      <button id="back-btn" onClick={() => push('/')}>Back</button>

      <h3>{url}</h3>

      <div
        id="annotation-img"
        style={{
          backgroundSize: 'contain',
          backgroundImage: `url('data:image/png;base64,${toBase64(
            screenshot.data,
          )}')`,
          position: 'relative',
          width: win.width / 2,
          height: win.height / 2,
        }}
      />
    </main>
  )
}
