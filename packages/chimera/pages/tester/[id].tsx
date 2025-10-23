import { Box, Container } from '@mui/material'
import { useRouter } from 'next/router'
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { AnnotationPayload, Annotations, ServiceManualLabel, serviceManualLabel } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/generator/screenshot-annotated'
import { xyCut } from 'infer-layout'
import { Rect, mergeColsFlat, regionsToAnnotations } from '../../util/generator'

type TightenResponse = {
  id: string
  rect: Rect,
  similar: {
    ok: boolean
    aspectDrift: number
    areaRatio: number
    original: Rect
    candidate: Rect
  }
}

const ignoreLabels: ServiceManualLabel[] = [
  ServiceManualLabel.row,
  ServiceManualLabel.column,
  ServiceManualLabel.diagram_number,
  ServiceManualLabel.text_unit,
  ServiceManualLabel.page_frame
]

// a partial clone of the frontend annotator...
const GenerateByExample = () => {
  const { query, isReady } = useRouter()
  const originalAnnotations = useRef<AnnotationPayload['annotations'] | null>(
    null,
  )
  const [annotations, setAnnotations] = useState<Annotations | null>(null)
  const [layout, setLayout] = useState<string>('')

  const labelToColor = useCallback((label: string) => {
    if (label.startsWith(`layout_tree_`)) {
      return {
        'layout_tree_row': 'purple',
        'layout_tree_column': 'blue'
      }[label]
    }
    return serviceManualLabel[label]
  }, [])

  const labelToOverride = useCallback((label: string): CSSProperties => {
    if (!label.startsWith(`layout_tree`)) {
      return {}
    }
    const fill = labelToColor(label)
    if (!fill) {
      return {}
    }
    return {
      opacity: 1,
      backgroundColor: 'transparent',
      border: `1px solid ${fill}`,
      color: 'transparent'
    }
  }, [labelToColor])


  const handleTighten = useCallback(async () => {
    if (!originalAnnotations.current) {
      return
    }
    fetch(`/api/screenshot/tighten/${query.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((r) => r.json())
      .then((resp: TightenResponse[]) => {
        setAnnotations(annotations => {
          return {
            ...annotations,
            payload: {
              annotations: originalAnnotations.current.map(a => {
                const entry = resp.find(r => r.id === a.id)
                if (!entry) {
                  console.error('could not find update for this annotation', a.id)
                  return a
                }
                return {
                  ...a,
                  rect: entry.rect,
                }
              })
            }
          }
        })
      })
      .catch(console.error)

  }, [query, setAnnotations])

  const handleInferLayout = useCallback(() => {
    if (!annotations) {
      return
    }
    const page = {
      width: annotations.viewWidth,
      height: annotations.viewHeight
    }
    // we assume that the layout has a helper label, "text_unit", the height of a single line of body text, to serve as the basis for a min gap threshold
    const textUnitElem = annotations.payload.annotations.find(
      a => a.label === ServiceManualLabel.text_unit)

    if (!textUnitElem) {
      console.log('cannot find text unit label.  Aborting')
      return
    }
    const unitHeight = textUnitElem.rect.height // volatile brew

    const excludeElems = (a: AnnotationPayload['annotations'][0]) => {
      return !ignoreLabels.includes(a.label as ServiceManualLabel)
    }
    const components = annotations.payload.annotations
      .filter(excludeElems)
      .map(a => ({
        type: a.label,
        id: a.id,
        bbox: ([
          a.rect.x,
          a.rect.y,
          a.rect.x + a.rect.width,
          a.rect.y + a.rect.height
        ] as [number, number, number, number])
      }))

    const root = xyCut({
      components,
      page,
      unitHeight,
      opts: {
        vMin: {
          unitMultiplier: 0.2
        },
        hMin: {
          unitMultiplier: 0.4
        }
      },
      useContentBounds: true
    })

    const processedRegions = mergeColsFlat({
      node: root,
      pageW: root.region[2] - root.region[0]
    })

    const newAnnotations = regionsToAnnotations(processedRegions)

    setAnnotations(
      annotations => ({
        ...annotations,
        payload: {
          annotations: newAnnotations
        }
      })
    )
  }, [annotations, setAnnotations, setLayout])

  useEffect(() => {
    if (!isReady) return
    fetch(`/api/annotation/${query.id}`)
      .then((r) => r.json())
      .then(({ data }: { data: Annotations }) => {
        if (data.tag !== 'service_manual') {
          window.alert('not a service manual screen')
          return
        }
        setAnnotations({
          ...data,
          payload: {
            annotations: data.payload.annotations
          }
        })
        originalAnnotations.current = data.payload.annotations
      })
      .catch(console.error)
  }, [isReady, query.id])

  if (!annotations) {
    return (
      <main id="annotation-view">
        <Container>
        </Container>
      </main>
    )
  }

  const {
    payload,
    screenshot,
    viewWidth,
    viewHeight,
  } = annotations

  const screenshotDataUrl = `data:image/png;base64,${Buffer.from(screenshot).toString('base64')}`
  return (
    <main id="annotation-view">
      <Container maxWidth="xl">
        <Box sx={{
          display: 'flex',
          }}>

          {/* the annotated screenshot column */}
          <div
            id="annotation-img-wrapper"
            style={{
              flexBasis: '90%',
              border: '1px solid #aaa',
              borderRight: 'none',
            }}
          >
            <ScreenshotAnnotator
              noLabel={label => label.startsWith(`layout_tree`)}
              labelToOverride={labelToOverride}
              labelToColor={labelToColor}
              screenshot={screenshotDataUrl}
              annotations={
                payload.annotations
              }
              frame={{ width: viewWidth, height: viewHeight }}
            >

            </ScreenshotAnnotator>

          </div>

          {/* the control panel column */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: '1',
            width: '20%',
            gap: '24px',
            background: 'cornsilk'
          }}>
            <h4>Control Panel</h4>
            <textarea rows={20} value={layout} />
            <button onClick={handleInferLayout}>infer layout</button>
            <button onClick={handleTighten}>tighten up</button>
          </Box>
        </Box>
      </Container>
    </main>
  )
}

export default GenerateByExample