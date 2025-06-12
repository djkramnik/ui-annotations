import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { Container } from '../../components/container'
import { Flex } from '../../components/flex'
import { annotationLabels } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/screenshot-annotated'   // ← NEW
import { SimpleDate } from '../../components/date'

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

type PageMode = | 'initial' | 'toggle' | 'draw' | 'danger'
type ToggleState = | 'delete' | 'adjust' | 'label'
type DangerState = | 'publish' | 'delete' | 'update'

export default function AnnotationPage() {
  const { query, push, isReady } = useRouter()
  const [annotation, setAnnotation] = useState<Annotation | null>(null)
  const [pageState, setPageState] = useState<{
    mode: PageMode
    toggleState: ToggleState | null
    dangerState: DangerState | null
    currToggleIndex: number | null
  }>({
    mode: 'initial',
    toggleState: null,
    dangerState: null,
    currToggleIndex: null
  })

  const handleDrawClick = useCallback(() => {
    setPageState({
      mode: 'draw',
      toggleState: null,
      dangerState: null,
      currToggleIndex: null
    })
  }, [setPageState])

  const handleToggleClick = useCallback(() => {
    setPageState({
      mode: 'toggle',
      toggleState: null,
      dangerState: null,
      currToggleIndex: 0,
    })
  }, [setPageState])

  const handlePublishClick = useCallback(() => {
    setPageState({
      mode: 'danger',
      toggleState: null,
      dangerState: 'publish',
      currToggleIndex: null,
    })
  }, [setPageState])

  const handleDeleteClick = useCallback(() => {
    setPageState({
      mode: 'danger',
      toggleState: null,
      dangerState: 'delete',
      currToggleIndex: null,
    })
  }, [setPageState])

  const handleUpdateClick = useCallback(() => {
    setPageState({
      mode: 'danger',
      toggleState: null,
      dangerState: 'update',
      currToggleIndex: null,
    })
  }, [setPageState])

  useEffect(() => {
    if (!isReady) return
    fetch(`/api/annotation/${query.id}`)
      .then(r => r.json())
      .then(({ data }) => setAnnotation(data))
      .catch(console.error)
  }, [isReady, query.id])

  if (!annotation) {
    return <p>Loading…</p>
  }

  const {
    url,
    date,
    scrollY,
    payload: { annotations },
    screenshot,
    viewWidth,
    viewHeight,
  } = annotation

  const screenshotDataUrl = `data:image/png;base64,${Buffer.from(screenshot).toString('base64')}`

  return (
    <main id="annotation-view">
      <Container>
        <button id="back-btn" onClick={() => push('/')}>
          Back
        </button>
        <Flex aic jcsb>
          <Flex aic gap="12px">
            <strong>{url}</strong>
            <p><strong>Date:</strong> <SimpleDate date={date} /></p>
            <p>Scroll: {scrollY}</p>
          </Flex>
          <Flex aic gap="12px">
            <button onClick={handleUpdateClick}>Update</button>
            <button onClick={handlePublishClick}>Publish</button>
            <button onClick={handleDeleteClick}>Delete</button>
          </Flex>
        </Flex>
        <Flex>
          <h3>Mode: {pageState.mode}</h3>
        </Flex>
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

          <Flex dir="column" gap="24px" style={{ flexGrow: '1' }}>
            <Flex
              style={{
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
            <Flex dir='column' gap="4px">
              <button onClick={handleDrawClick}>
                Draw
              </button>
              <button onClick={handleToggleClick}>
                Toggle
              </button>
            </Flex>
          </Flex>
        </Flex>
      </Container>
    </main>
  )
}
