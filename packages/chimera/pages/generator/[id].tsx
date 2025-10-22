import { Box, Container } from '@mui/material'
import { useRouter } from 'next/router'
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { AnnotationPayload, Annotations, ServiceManualLabel, serviceManualLabel } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/generator/screenshot-annotated'
import { buildLayoutTree, xyCut } from 'infer-layout'
import { unpackLayoutTree, xyNodeToAnnotations } from '../../util/generator'

const ignoreLabels: ServiceManualLabel[] = [
  ServiceManualLabel.row,
  ServiceManualLabel.column,
]

// a partial clone of the frontend annotator...
const GenerateByExample = () => {
  const { query, push, isReady } = useRouter()
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
      border: `2px solid ${fill}`,
      color: 'transparent'
    }
  }, [labelToColor])

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
      return a !== textUnitElem && !ignoreLabels.includes(a.label as ServiceManualLabel)
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
      minGap: unitHeight * 0.2 // dubious sauce,
    })

    const layoutTree = buildLayoutTree({
      root,
      unitHeight,
      components: components.reduce((acc, c) => {
        return {
          ...acc,
          [c.id]: c
        }
      }, {}) // great naming job!
    })
    const newAnnotations = unpackLayoutTree(layoutTree)
      .filter(a => a.label.startsWith('layout_tree_'))

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
            .filter(a => !ignoreLabels.includes(a.label as ServiceManualLabel))
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
    url,
    date,
    scrollY,
    payload,
    screenshot,
    viewWidth,
    viewHeight,
    published,
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
          </Box>
        </Box>
      </Container>
    </main>
  )
}

export default GenerateByExample