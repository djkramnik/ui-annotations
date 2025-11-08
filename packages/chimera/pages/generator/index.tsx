// specify an id, perhaps get a small preview of the screenshot,
// run infer-layout (with or without tighten)
// generate data for the preview (which then gets saved in local storage)
import { useRouter } from 'next/router'
import { Box, Container } from '@mui/material'
import { FormEvent, useCallback, useState } from 'react'
import { Screenshot, ServiceManualLabel } from 'ui-labelling-shared'
import { fetchScreenshotById, fetchTighterAnnotations } from '../../util/api'
import { PreviewScreenshot } from '../../components/generator/preview-screenshot'
import { Flex } from '../../components/generator/flex'
import { xyCut } from 'infer-layout'
import { assignAnnotations, bboxToRect, mergeColsFlat, PreviewSchema } from '../../util/generator'
import { GeneratedPreview } from '../../components/generator/preview'

const GenerateFromExample = () => {
  const { query, isReady } = useRouter()
  const [annoId, setAnnoId] = useState<string>('2460')
  const [queryId, setQueryId] = useState<number | null>(null)
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null)
  const [preview, setPreview] = useState<PreviewSchema | null>(null)
  const [previewIter, setPreviewIter] = useState<number>(0)
  const [nextId, setNextId] = useState<number | null>(null)
  const [prevId, setPrevId] = useState<number | null>(null)
  const [debug, setDebug] = useState<boolean>(false)

  const fetchScreen = useCallback(async (id: number) => {
    const screenshotResp = await fetchScreenshotById(id)
    if (!screenshotResp) {
      window.alert('fetch screenshot failed')
      return
    }
    const { data, next, prev } = screenshotResp
    setScreenshot(data)
    setQueryId(id)
    setNextId(next ?? null)
    setPrevId(prev ?? null)
  }, [setScreenshot, setQueryId, setNextId, setPrevId])

  const handleNext = useCallback(() => {
    if (nextId === null) {
      return
    }
    fetchScreen(nextId)
  }, [query, isReady, nextId, fetchScreen])

  const handlePrev = useCallback(() => {
    if (prevId === null) {
      return
    }
    fetchScreen(prevId)
  }, [query, isReady, prevId, fetchScreen])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (!annoId) {
        return
      }
      const id = Number(annoId)
      if (Number.isNaN(id)) {
        return
      }
      fetchScreen(id)
    },
    [annoId, fetchScreen],
  )

  const generate = useCallback((preview: PreviewSchema, debug?: boolean) => {
    setPreview(preview)
    setPreviewIter(i => i + 1)
    setDebug(debug === true)
  }, [setPreviewIter, setPreview, setDebug])

  return (
    <Container sx={{ maxWidth: '96vw !important'}}>
      <Box>
        <h3>Get Annotations By Id</h3>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <label>Annotation Id: </label>
            <input
              required
              value={annoId}
              onChange={(e) => setAnnoId(e.target.value)}
            />
          </div>
          <Flex aic gap="4px" style={{ margin: '12px 0'}}>
            <button type="submit">Submit</button>
            <button type="button" disabled={prevId === null} onClick={handlePrev}>Prev</button>
            <button type="button" disabled={nextId === null} onClick={handleNext}>Next</button>
          </Flex>
        </form>
      </Box>
      <hr />
      {screenshot && !Number.isNaN(Number(String(queryId))) ? (
        <>
          <h3>Generate Synthetic Copy of Annotation?</h3>
          <Flex gap="24px">
            <PreviewScreenshot screenshot={screenshot} />
            <GenSyntheticForm screenshot={screenshot} id={queryId as number}
              onSubmit={generate}
            />
          </Flex>
        </>
      ) : null}
      {
        preview && screenshot
          ? (
            <div key={previewIter}>
              <GeneratedPreview
                parentId={screenshot.id}
                parentTag={screenshot.tag}
                preview={preview}
                iter={previewIter}
                debug={debug}
                />
            </div>
          )
          : null
      }
    </Container>
  )
}

export default GenerateFromExample

// when calculating layout ignore these
const ignoreForLayout: ServiceManualLabel[] = [
  ServiceManualLabel.row,
  ServiceManualLabel.column,
  ServiceManualLabel.diagram_number,
  ServiceManualLabel.text_unit,
  ServiceManualLabel.page_frame,
  ServiceManualLabel.image_id
]
const ignoreForGen: ServiceManualLabel[] = [
  ServiceManualLabel.row,
  ServiceManualLabel.column,
  ServiceManualLabel.text_unit
]

function GenSyntheticForm({
  screenshot,
  id,
  onSubmit
}: {
  screenshot: Screenshot
  id: number
  onSubmit: (schema: PreviewSchema, debug?: boolean) => any
}) {
  const [tighten, setTighten] = useState<boolean>(false)
  const [debug, setDebug] = useState<boolean>(false)
  const [designPref, setDesignPref] = useState<'mui' | 'ant'>('mui')
  const [schemaConfirmed, setSchemaConfirmed] = useState<boolean>(false)

  // optionally perform tighten
  // save preferences (for now just mui or ant)
  //
  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const textUnitElem = screenshot.annotations.find(
        a => a.label === ServiceManualLabel.text_unit)

      if (!textUnitElem) {
        console.error('cannot find text unit label.  Aborting')
        return
      }

      const processedScreenshot = tighten
        ? (await getTighter(screenshot, id))
        : screenshot

      const layoutComponents = processedScreenshot.annotations
        .filter(a => !ignoreForLayout.includes(a.label as ServiceManualLabel))
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
        components: layoutComponents,
        page: {
          width: processedScreenshot.view_width,
          height: processedScreenshot.view_height,
        },
        unitHeight: textUnitElem.rect.height,
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

      const regionBoxes = mergeColsFlat({
        node: root,
        pageW: root.region[2] - root.region[0],
        opts: { maxFrac: 0.3 }
      })

      // we have to recalculate where all the annotations fall since we discarded some when
      // calculating layout
      const assignments = assignAnnotations(
        regionBoxes.map(({ region }) => bboxToRect(region)),
        processedScreenshot.annotations.filter(
          a => !ignoreForGen.includes(a.label as ServiceManualLabel)
        )
      )

      const layout: PreviewSchema['layout'] = assignments
      // resort from top to bottom sigh
      .sort((a, b) => {
        const aRegion = regionBoxes[a.idx]!
        const bRegion = regionBoxes[b.idx]!
        return aRegion.region[1] - bRegion.region[1] || aRegion.region[0] - bRegion.region[0]
      })

      .map(({ idx, components }) => {
        return {
          rect: bboxToRect(regionBoxes[idx].region),
          components
        }
      })

      onSubmit({
        screenshot: {
          ...screenshot,
          annotations: processedScreenshot.annotations
            .filter(a => {
              return !ignoreForGen.includes(a.label as ServiceManualLabel)
            }),
        },
        layout,
        designPref,
        contentBounds: bboxToRect(root.region)
      }, debug)
      setSchemaConfirmed(true)
    },
    [designPref, tighten, screenshot, setSchemaConfirmed, id, debug],
  )

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Flex col gap="8px">
          <div>
            <label key="debug">
              <input
                type="checkbox"
                checked={debug}
                onChange={(e) => setDebug(e.target.checked)}
              />
              Debug?
            </label>
          </div>
          <div>
            <label key="tighten">
              <input
                type="checkbox"
                checked={tighten}
                onChange={(e) => setTighten(e.target.checked)}
              />
              Tighter?
            </label>
          </div>
          <div>
            <label key="mui">
              <input
                type="radio"
                name="designPref"
                value="mui"
                checked={designPref === 'mui'}
                onChange={(e) => {
                  if (!e.target.checked) {
                    return
                  }
                  setDesignPref(e.target.value as any)
                }}
              />
              use mui components
            </label>
            <label key="ant">
              <input
                type="radio"
                name="designPref"
                value="ant"
                checked={designPref === 'ant'}
                onChange={(e) => {
                  if (!e.target.checked) {
                    return
                  }
                  setDesignPref(e.target.value as any)
                }}
              />
              use ant components
            </label>
          </div>
          <button type="submit">
            submit
          </button>
        </Flex>
      </form>
      {
        schemaConfirmed
          ? (
            'Preview generated!'
          )
          : null
      }
    </div>
  )
}

async function getTighter(screenshot: Screenshot, id: number): Promise<Screenshot> {
  const resp = await fetchTighterAnnotations(id)
  if (resp === null) {
    throw Error('failed to get tighter')
  }
  return {
    ...screenshot,
    annotations: screenshot.annotations.map(a => {
        const matching = resp.find(r => r.id === a.id)
        if (!matching) {
          return a
        }
        return {
          ...a,
          rect: matching.rect
        }
      })
  }
}