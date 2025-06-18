import { useRouter } from 'next/router'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Container } from '../../components/container'
import { Flex } from '../../components/flex'
import { annotationLabels } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/screenshot-annotated'   // ← NEW
import { SimpleDate } from '../../components/date'
import { deleteAnnotation, publishAnnotation, unPublishAnnotation } from '../../api'
import { DrawSurface } from '../../components/draw-surface'
import { Rect } from '../../utils/type'
import { Popup } from '../../components/popup'

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
  published: | 0 | 1
}

type PageMode = | 'initial' | 'toggle' | 'draw' | 'danger'
type ToggleState = | 'delete' | 'adjust' | 'label'
type DangerState = | 'publish' | 'delete' | 'update'

export default function AnnotationPage() {
  const originalAnnotations = useRef<AnnotationPayload['annotations'] | null>(null)
  const [changed, setChanged] = useState<boolean>(false)
  const [disabled, setDisabled] = useState<boolean>(false)
  const { query, push, isReady } = useRouter()
  const [annotation, setAnnotation] = useState<Annotation | null>(null)
  const [pageState, setPageState] = useState<{
    mode: PageMode
    toggleState: ToggleState | null
    dangerState: DangerState | null
    drawCandidate?: Rect
    currToggleIndex: number | null
  }>({
    mode: 'initial',
    toggleState: null,
    dangerState: null,
    currToggleIndex: null
  })

  const labels = useMemo(() => {
    return Object.keys(annotationLabels)
  }, [])

  const resetPageState = useCallback(() => {
    setPageState({
      mode: 'initial',
      toggleState: null,
      dangerState: null,
      currToggleIndex: null
    })
  }, [setPageState])

  const NewAnnotationForm = useMemo(() => {
    return () => !pageState.drawCandidate ? null : (
      <Popup handleClose={resetPageState}>
        <form onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault()
          const select = e.currentTarget.elements.namedItem('label') as HTMLSelectElement
          setAnnotation(annotation => ({
            ...annotation,
            payload: {
              annotations: annotation.payload.annotations.concat({
                id: String(new Date().getTime()), // I am baffled why I ever included this
                label: select.value,
                rect: pageState.drawCandidate
              })
            }
          }))
          resetPageState()
        }}>
          <Flex dir="column" gap="12px">
            <Flex>
              <Flex dir="column">
                <label htmlFor="label-select">Annotation Label</label>
                <select id="label-select" name="label" required>
                  <option value="" disabled selected>Select label</option>
                  {
                    labels.map(label => {
                      return (
                        <option key={label} value={label}>{label}</option>
                      )
                    })
                  }
                </select>
              </Flex>
            </Flex>
            <Flex gap="6px">
              <button type="submit">
                submit
              </button>
              <button type="button" onClick={resetPageState}>
                cancel
              </button>
            </Flex>
          </Flex>
        </form>
      </Popup>
    )
  }, [pageState, resetPageState, labels, setAnnotation])

  const handleNewDrawCandidate = useCallback((rect: Rect) => {
    setPageState(state => ({...state, drawCandidate: rect}))
  }, [setPageState])

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
    if (disabled || !annotation) {
      return
    }
    setPageState({
      mode: 'danger',
      toggleState: null,
      dangerState: 'publish',
      currToggleIndex: null,
    })
    setDisabled(true)
    const proceed =  window.confirm(`Sure you want to ${annotation.published === 0 ? 'PUBLISH' : 'UNPUBLISH'} this dubious work?`)
    if (!proceed) {
      setDisabled(false)
      return
    }
    const task: (n: number) => Promise<void> = annotation.published === 0
      ? publishAnnotation
      : unPublishAnnotation
    try {
      task(Number(String(query.id)))
        .then(() => push('/'))
    } catch {
      // show toast
    } finally {
      setDisabled(false)
    }
  }, [setPageState, setDisabled, disabled, annotation])

  const handleDeleteClick = useCallback(() => {
    if (disabled) {
      return
    }
    setDisabled(true)
    setPageState({
      mode: 'danger',
      toggleState: null,
      dangerState: 'delete',
      currToggleIndex: null,
    })
    const proceed =  window.confirm('Sure you want to DELETE this wonderful work?')
    if (!proceed) {
      setDisabled(false)
      return
    }
    try {
      deleteAnnotation(Number(String(query.id)))
        .then(() => push('/'))
    } catch {
      // show toast
    } finally {
      setDisabled(false)
    }
  }, [setPageState, setDisabled, disabled, query])

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
      .then(({ data }: { data: Annotation }) => {
        setAnnotation(data)
        originalAnnotations.current = data.payload.annotations
      })
      .catch(console.error)
  }, [isReady, query.id])

  // whenever annotations changes, monitor for difference from original
  // to keep track of whether there are unsaved changes.  This will be used when navigating away from page, to show a warn
  // and to populate a helpful old man capitalized message
  useEffect(() => {
    if (!annotation || !originalAnnotations.current) {
      return
    }
    const newPayload = annotation.payload.annotations
    setChanged(
      newPayload.length !== originalAnnotations.current.length ||
      newPayload.some((item, index) => {
        const og = originalAnnotations[index]
        return item.id !== og.id ||
          item.label !== og.label ||
          item.rect.x !== og.rect.x ||
          item.rect.y !== og.rect.y ||
          item.rect.width !== og.rect.width ||
          item.rect.height !== og.rect.height
      })
    )
  }, [setChanged, annotation])

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
    published
  } = annotation

  const screenshotDataUrl = `data:image/png;base64,${Buffer.from(screenshot).toString('base64')}`

  return (
    <main id="annotation-view">
      {
        pageState.drawCandidate
          ? (
            <NewAnnotationForm />
          )
          : null
      }
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
            <button onClick={handleUpdateClick}
              disabled={disabled}>Update</button>
            <button onClick={handlePublishClick}
              disabled={disabled}>
                {published === 0 ? `Publish` : `UnPublish`}
              </button>
            <button onClick={handleDeleteClick}
              disabled={disabled}>Delete</button>
          </Flex>
        </Flex>
        <Flex gap="12px" aic>
          <h3>Mode: {pageState.mode}</h3>
          <strong>{changed ? 'THERE BE UNSAVED CHANGES' : 'NO CHANGES!'}</strong>
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
            >
            {
              pageState.mode === 'draw'
                ? (
                  <DrawSurface
                    handleCandidate={handleNewDrawCandidate}
                    ogHeight={viewHeight}
                    ogWidth={viewWidth}
                  />
                )
                : null
            }
            </ScreenshotAnnotator>
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
              <button onClick={handleDrawClick} disabled={disabled}>
                Draw
              </button>
              <button onClick={handleToggleClick} disabled={disabled}>
                Toggle
              </button>
            </Flex>
          </Flex>
        </Flex>
      </Container>
    </main>
  )
}
