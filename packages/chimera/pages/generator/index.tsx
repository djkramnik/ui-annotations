// specify an id, perhaps get a small preview of the screenshot,
// run infer-layout (with or without tighten)
// generate data for the preview (which then gets saved in local storage)

import { Box, Container } from '@mui/material'
import { FormEvent, useCallback, useState } from 'react'
import { Annotations, ServiceManualLabel } from 'ui-labelling-shared'
import { fetchAnnotationById, fetchTighterAnnotations, TightenResponse } from '../../util/api'
import { Base64Img } from '../../components/generator/base64-img'
import { Flex } from '../../components/generator/flex'
import { xyCut } from 'infer-layout'
import { bboxToRect, mergeColsFlat } from '../../util/generator'
import { PreviewSchema, writePreviewSchema } from '../../util/localstorage'

const GenerateFromExample = () => {
  const [annoId, setAnnoId] = useState<string>('2460')
  const [queryId, setQueryId] = useState<number | null>(null)
  const [annotations, setAnnotations] = useState<Annotations | null>(null)
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
      const annotations = await fetchAnnotationById(id)
      if (!annotations) {
        window.alert('fetch annotations failed')
        return
      }
      setAnnotations(annotations)
      setQueryId(id)
      console.log('annotations', annotations)
    },
    [annoId, setAnnotations, setQueryId],
  )

  return (
    <Container>
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
          <button type="submit">Submit</button>
        </form>
      </Box>
      <hr />
      {annotations && !Number.isNaN(Number(String(queryId))) ? (
        <>
          <h3>Generate Synthetic Copy of Annotation?</h3>
          <Flex gap="24px">
            <PreviewAnnotation annotations={annotations} />
            <GenSyntheticForm annotations={annotations} id={queryId as number} />
          </Flex>
        </>
      ) : null}
    </Container>
  )
}

export default GenerateFromExample

function PreviewAnnotation({ annotations }: { annotations: Annotations }) {
  const { screenshot } = annotations

  return (
    <Flex gap="12px">
      <Flex aic>
        <Base64Img
          source={screenshot}
          style={{ width: '200px', border: '1px solid black' }}
        />
      </Flex>
      <Flex>
        <ul>
          <li>id: {annotations.id}</li>
          <li>width: {annotations.viewWidth}</li>
          <li>height: {annotations.viewHeight}</li>
          <li>tag: {annotations.tag ?? 'no tag'}</li>
        </ul>
      </Flex>
    </Flex>
  )
}

// when calculating layout ignore these
const ignoreForLayout: ServiceManualLabel[] = [
  ServiceManualLabel.row,
  ServiceManualLabel.column,
  ServiceManualLabel.diagram_number,
  ServiceManualLabel.text_unit,
  ServiceManualLabel.page_frame
]
const ignoreAlways: ServiceManualLabel[] = [
  ServiceManualLabel.row,
  ServiceManualLabel.column,
  ServiceManualLabel.text_unit
]

function GenSyntheticForm({
  annotations,
  id
}: {
  annotations: Annotations
  id: number
}) {
  const [tighten, setTighten] = useState<boolean>(true)
  const [designPref, setDesignPref] = useState<'mui' | 'ant'>('mui')

  // optionally perform tighten
  // save preferences (for now just mui or ant)
  //
  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const textUnitElem = annotations.payload.annotations.find(
        a => a.label === ServiceManualLabel.text_unit)

      if (!textUnitElem) {
        console.error('cannot find text unit label.  Aborting')
        return
      }

      const processedAnnotations = tighten
        ? (await getTighter(annotations, id))
        : annotations

      const components = annotations.payload.annotations
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
        components,
        page: {
          width: annotations.viewWidth,
          height: annotations.viewHeight,
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

      const layout: PreviewSchema['layout'] = mergeColsFlat({
        node: root,
        pageW: root.region[2] - root.region[0]
      }).map(({ region, components }) => {
        return {
          components,
          rect: bboxToRect(region),
        }
      })

      writePreviewSchema({
        annotations: processedAnnotations,
        layout,
        designPref,
        contentBounds: bboxToRect(root.region)
      })
    },
    [designPref, tighten, annotations],
  )

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <Flex col gap="8px">
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
    </div>
  )
}

async function getTighter(annotations: Annotations, id: number): Promise<Annotations> {
  const resp = await fetchTighterAnnotations(id)
  if (resp === null) {
    throw Error('failed to get tighter')
  }
  return {
    ...annotations,
    payload: {
      annotations: annotations.payload.annotations.map(a => {
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
}