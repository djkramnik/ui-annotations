import { useRouter } from 'next/router'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Container } from '../../components/container'
import { Flex } from '../../components/flex'
import { annotationLabels } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/screenshot-annotated'   // ← NEW
import { SimpleDate } from '../../components/date'
import { deleteAnnotation, publishAnnotation, unPublishAnnotation } from '../../api'
import { DrawSurface } from '../../components/draw-surface'
import { Annotations, AnnotationPayload, Rect } from '../../utils/type'
import { Popup } from '../../components/popup'
import { useLabels } from '../../hooks/labels'
import { AnnotationToggler } from '../../components/annotation'
import { useAdjustRect } from '../../hooks/adjust'
import { adjustAnnotation } from '../../utils/adjust'

type PageMode = | 'initial' | 'toggle' | 'draw' | 'danger'
type ToggleState = | 'delete' | 'adjust' | 'label'
type DangerState = | 'publish' | 'delete' | 'update'

export default function AnnotationPage() {
  const originalAnnotations = useRef<AnnotationPayload['annotations'] | null>(null)
  const [changed, setChanged] = useState<boolean>(false)
  const [disabled, setDisabled] = useState<boolean>(false)
  const { query, push, isReady } = useRouter()
  const [annotations, setAnnotations] = useState<Annotations | null>(null)
  // this is just some hack to force a reset of the adjustment value
  const [adjustReset, setAdjustReset] = useState<boolean>(false)

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

  const labels = useLabels()

  const adjustment = useAdjustRect(typeof pageState.currToggleIndex === 'number'
    ? (annotations?.[pageState.currToggleIndex] ?? null)
    : null,
    pageState.currToggleIndex ?? 0,
    adjustReset
  )

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
          setAnnotations(annotations => ({
            ...annotations,
            payload: {
              annotations: annotations.payload.annotations.concat({
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
                  <option value="" disabled defaultValue="true">Select label</option>
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
  }, [pageState, resetPageState, labels, setAnnotations])

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
    if (disabled || !annotations) {
      return
    }
    setPageState({
      mode: 'danger',
      toggleState: null,
      dangerState: 'publish',
      currToggleIndex: null,
    })
    setDisabled(true)
    const proceed =  window.confirm(`Sure you want to ${annotations.published === 0 ? 'PUBLISH' : 'UNPUBLISH'} this dubious work?`)
    if (!proceed) {
      setDisabled(false)
      return
    }
    const task: (n: number) => Promise<void> = annotations.published === 0
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
  }, [setPageState, setDisabled, disabled, annotations])

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

  const handleToggleIndexChange = useCallback((newIndex: number) => {
    setPageState(state => {
      if (state.mode !== 'toggle') {
        console.error('SOMETHING WENT VERY WRONG.')
        return state
      }
      state.currToggleIndex = newIndex
      return {...state}
    })
  }, [setPageState])

  const handleAnnotationUpdate = useCallback((newLabel: string, index: number) => {
    if (pageState.currToggleIndex === null) {
      console.error('SOMETHING WENT VERY WRONG IN HANDLE ANNOTATION UPDATE')
      return
    }
    setAnnotations(annotations => {
      const curr = annotations.payload.annotations[index]
      return {
        ...annotations,
        payload: {
          annotations: annotations.payload.annotations.map(a => {
            if (curr.id === a.id) {
              return adjustAnnotation({
                ...a,
                label: newLabel, // holy shit
              }, adjustment)
            }
            return a
          })
        }
      }
    })
    setAdjustReset(reset => !reset)
  }, [pageState, setAnnotations, adjustment, setAdjustReset])

  const handleRemoveAnnotation = useCallback((index: number) => {
    const proceed = window.confirm('you sure?  you sure you want to delete this wonderful annotation?')
    if (!proceed) {
      return
    }
    setAnnotations(annotations => {
      const curr = annotations.payload.annotations[index]
      return {
        ...annotations,
        payload: {
          annotations: annotations.payload.annotations.filter(a => {
            return a !== curr
          })
        }
      }
    })
    // react hack.  we only do this to force an effect to run within useAdjustRect
    setAdjustReset(reset => !reset)
  }, [setAnnotations, setAdjustReset])

  useEffect(() => {
    if (!isReady) return
    fetch(`/api/annotation/${query.id}`)
      .then(r => r.json())
      .then(({ data }: { data: Annotations }) => {
        setAnnotations(data)
        originalAnnotations.current = data.payload.annotations
      })
      .catch(console.error)
  }, [isReady, query.id])

  // whenever annotations changes, monitor for difference from original
  // to keep track of whether there are unsaved changes.
  // This will be used when navigating away from page, to show a warn
  // and to populate a helpful old man capitalized message
  useEffect(() => {
    if (!annotations || !originalAnnotations.current) {
      return
    }
    const newPayload = annotations.payload.annotations
    setChanged(
      newPayload.length !== originalAnnotations.current.length ||
      newPayload.some((item, index) => {
        const og = originalAnnotations.current[index]
        return item.id !== og.id ||
          item.label !== og.label ||
          item.rect.x !== og.rect.x ||
          item.rect.y !== og.rect.y ||
          item.rect.width !== og.rect.width ||
          item.rect.height !== og.rect.height
      })
    )
  }, [setChanged, annotations])

  if (!annotations) {
    return <p>Loading…</p>
  }

  const {
    url,
    date,
    scrollY,
    payload,
    screenshot,
    viewWidth,
    viewHeight,
    published
  } = annotations

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
              labelOverride={
                pageState.mode !== 'toggle'
                  ? undefined
                  : {
                    backgroundColor: 'transparent',
                    border: `1px solid #16F529`
                  }
              }
              annotations={
                pageState.mode !== 'toggle'
                  ? payload.annotations
                  : [adjustAnnotation(payload.annotations[pageState.currToggleIndex ?? 0], adjustment)]
                }
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

          <Flex dir="column" gap="24px" style={{ flexGrow: '1', maxWidth: '10%' }}>
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
            {
              pageState.mode === 'toggle' && typeof pageState.currToggleIndex === 'number'
                ? (
                  <AnnotationToggler
                    annotations={payload.annotations}
                    handleIndexChange={handleToggleIndexChange}
                    handleUpdate={handleAnnotationUpdate}
                    handleRemove={handleRemoveAnnotation}
                  />
                )
                : null
            }
          </Flex>
        </Flex>
      </Container>
    </main>
  )
}
