import { Box, Container } from '@mui/material'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnnotationPayload, Annotations, ServiceManualLabel, serviceManualLabel } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/generator/screenshot-annotated'
import { buildLayoutTree, normalize } from '../../util/generator/infer-layout'
import { toLayoutInput, unpackLayoutTree } from '../../util/generator'

const ignoreLabels: ServiceManualLabel[] = [
  ServiceManualLabel.row,
  ServiceManualLabel.column
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
    return serviceManualLabel[label]
  }, [])

  const handleInferLayout = useCallback(() => {
    if (!annotations) {
      return
    }
    const pageInfo = {
      width: annotations.viewWidth,
      height: annotations.viewHeight
    }

    const elemInputs = toLayoutInput(annotations.payload)
    // console.log('elem inputs??', elemInputs)
    const normElems = normalize(elemInputs, pageInfo)

    // console.log('norm? elems??', normElems)

    const layout = buildLayoutTree(
      normElems,
      pageInfo
    )
    console.log('LAYOUT', layout)
    setLayout(JSON.stringify(layout))
    console.log('UNPACKED', unpackLayoutTree(layout))
  }, [annotations, setLayout])

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