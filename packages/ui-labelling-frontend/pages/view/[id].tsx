import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { toBase64 } from '../../utils/base64'
import { Container } from '../../components/container'
import { Flex } from '../../components/flex'
import { annotationLabels } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/screenshot-annotated'   // ← NEW

interface AnnotationPayload {
  annotations: {
    id: string
    label: string
    rect: { x: number; y: number; width: number; height: number }
  }[]
}

interface Annotation {
  url: string
  payload: AnnotationPayload
  screenshot: ArrayBuffer
  scrollY: number
  viewHeight: number
  viewWidth: number
  date: string
  id: number
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
    payload: { annotations },
    screenshot,
    viewWidth,
    viewHeight,
  } = annotation

  const screenshotDataUrl = `data:image/png;base64,${toBase64(screenshot)}`

  return (
    <main id="annotation-view">
      <Container>
        <button id="back-btn" onClick={() => push('/')}>
          Back
        </button>
        <h3>{url}</h3>
        <Flex>
          {/* ───────── screenshot with live-scaled rectangles ───────── */}
          <div
            id="annotation-img-wrapper"
            style={{
              flexBasis: '90%',
              border: '1px solid #aaa',
              borderRight: 'none',
            }}
          >
            <ScreenshotAnnotator
              screenshot={screenshotDataUrl}
              annotations={annotations}
              frame={{ width: viewWidth, height: viewHeight }}
            />
          </div>

          {/* ───────── colour legend ───────── */}
          <Flex
            style={{
              flexGrow: 1,
              border: '1px solid #aaa',
              backgroundColor: '#fff',
              padding: 4,
              flexDirection: 'column',
            }}
          >
            {Object.entries(annotationLabels).map(([label, colour]) => (
              <div
                key={label}
                style={{
                  width: '100%',
                  backgroundColor: colour,
                  padding: 4,
                  fontSize: 16,
                }}
              >
                {label}
              </div>
            ))}
          </Flex>
        </Flex>
      </Container>
    </main>
  )
}
