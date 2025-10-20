import { Box, Container } from '@mui/material'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnnotationPayload, Annotations, serviceManualLabel } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/generator/screenshot-annotated'

// a partial clone of the frontend annotator...
const GenerateByExample = () => {
  const { query, push, isReady } = useRouter()
  const originalAnnotations = useRef<AnnotationPayload['annotations'] | null>(
    null,
  )
  const [annotations, setAnnotations] = useState<Annotations | null>(null)

  const labelToColor = useCallback((label: string) => {
    return serviceManualLabel[label]
  }, [])

  useEffect(() => {
    if (!isReady) return
    fetch(`/api/annotation/${query.id}`)
      .then((r) => r.json())
      .then(({ data }: { data: Annotations }) => {
        setAnnotations(data)
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
      <Container>
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
            maxWidth: '10%',
            gap: '24px'
          }}>
            CONTROL PANEL
          </Box>
        </Box>
      </Container>
    </main>
  )
}

export default GenerateByExample