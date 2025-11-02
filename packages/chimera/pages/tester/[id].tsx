import { Box, Container } from '@mui/material'
import { useRouter } from 'next/router'
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { Annotation, Screenshot, ServiceManualLabel, serviceManualLabel } from 'ui-labelling-shared'
import ScreenshotAnnotator from '../../components/generator/screenshot-annotated'
import { xyCut } from 'infer-layout'
import { mergeColsFlat, regionsToAnnotations } from '../../util/generator'
import { TightenResponse } from '../../util/api'

const ignoreLabels: ServiceManualLabel[] = [
  ServiceManualLabel.row,
  ServiceManualLabel.column,
  ServiceManualLabel.diagram_number,
  ServiceManualLabel.text_unit,
  ServiceManualLabel.page_frame
]

// a partial clone of the frontend annotator...
const TextHeuristics = () => {
  const { query, isReady } = useRouter()
  const originalAnnotations = useRef<Annotation[] | null>(
    null,
  )
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null)
  const [layout, setLayout] = useState<string>('')

  const labelToColor = useCallback((label: string) => {
    if (label.startsWith(`layout_tree_`)) {
      return {
        'layout_tree_row': 'purple',
        'layout_tree_column': 'blue'
      }[label] ?? null
    }
    return serviceManualLabel[label as ServiceManualLabel] ?? null
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
    fetch(`/api/util/tighten/${query.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((r) => r.json())
      .then((resp: TightenResponse[]) => {
        setScreenshot(screenshot => {
          if (!screenshot) {
            return null
          }
          return {
            ...screenshot,
              annotations: originalAnnotations.current!.map(a => {
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
        })
      })
      .catch(console.error)

  }, [query, setScreenshot])

  const handleInferLayout = useCallback(() => {
    if (!screenshot) {
      return
    }
    const page = {
      width: screenshot.view_width,
      height: screenshot.view_height
    }
    // we assume that the layout has a helper label, "text_unit", the height of a single line of body text, to serve as the basis for a min gap threshold
    const textUnitElem = screenshot.annotations.find(
      a => a.label === ServiceManualLabel.text_unit)

    if (!textUnitElem) {
      console.log('cannot find text unit label.  Aborting')
      return
    }
    const unitHeight = textUnitElem.rect.height // volatile brew

    const excludeElems = (a: Annotation) => {
      return !ignoreLabels.includes(a.label as ServiceManualLabel)
    }
    const components = screenshot.annotations
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
      pageW: root.region[2] - root.region[0],
      opts: { maxFrac: 0.3 }
    })

    const newAnnotations = regionsToAnnotations(processedRegions)

    setScreenshot(
      screenshot=> ({
        ...screenshot!,
        annotations: newAnnotations
      })
    )
  }, [screenshot, setScreenshot, setLayout])

  useEffect(() => {
    if (!isReady) return
    fetch(`/api/screenshot/${query.id}`)
      .then((r) => r.json())
      .then(({ data }: { data: Screenshot }) => {
        if (data.tag !== 'service_manual') {
          window.alert('not a service manual screen')
          return
        }
        setScreenshot(data)
        originalAnnotations.current = data.annotations
      })
      .catch(console.error)
  }, [isReady, query.id])

  if (!screenshot) {
    return (
      <main id="annotation-view">
        <Container>
        </Container>
      </main>
    )
  }

  const {
    annotations,
    image_data,
    view_width,
    view_height,
  } = screenshot

  const screenshotDataUrl = `data:image/png;base64,${Buffer.from(image_data).toString('base64')}`
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
              annotations={annotations}
              frame={{ width: view_width, height: view_height }}
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

export default TextHeuristics