// specify an id, perhaps get a small preview of the screenshot,
// run infer-layout (with or without tighten)
// generate data for the preview (which then gets saved in local storage)

import { Box, Container } from "@mui/material"
import { FormEvent, useCallback, useState } from "react"
import { Annotations } from "ui-labelling-shared"
import { fetchAnnotationById } from "../../util/api"
import { Base64Img } from "../../components/generator/base64-img"
import { Flex } from "../../components/generator/flex"

const GenerateFromExample = () => {
  const [annoId, setAnnoId] = useState<string>('2460')
  const [annotations, setAnnotations] = useState<Annotations | null>(null)
  const handleSubmit = useCallback(async (event: FormEvent) => {
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
    console.log('annotations', annotations)
  }, [annoId, setAnnotations])

  return (
    <Container>
      <Box>
        <h3>Get Annotations By Id</h3>
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <label>Annotation Id: </label>
            <input required value={annoId} onChange={e => setAnnoId(e.target.value)} />
          </div>
          <button type="submit">Submit</button>
        </form>
      </Box>
      <hr />
      {
        annotations
          ? (
            <>
              <h3>Generate Synthetic Copy of Annotation?</h3>
              <Flex gap="24px">
                <PreviewAnnotation annotations={annotations} />
                <GenSyntheticForm annotations={annotations} />
              </Flex>

            </>
          )
          : null
      }
    </Container>
  )
}

export default GenerateFromExample

function PreviewAnnotation({
  annotations
}: {
  annotations: Annotations
}) {
  const { screenshot } = annotations

  return (
    <Flex gap="12px">
      <Flex aic>
        <Base64Img source={screenshot} style={{ width: '200px', border: '1px solid black' }} />
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

function GenSyntheticForm({
  annotations
}: {
  annotations: Annotations
}) {
  const [tighten, setTighten] = useState<boolean>(true)
  const [designPref, setDesignPref] = useState<'mui' | 'ant'>('mui')

  // optionally perform tighten
  // save preferences (for now just mui or ant)
  //
  const handleSubmit = useCallback((event: FormEvent) => {
    event.preventDefault()
    console.log('we here', designPref, tighten)
  }, [designPref, tighten])

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label key="tighten">
            <input type="checkbox" checked={tighten} onChange={e => setTighten(e.target.checked)} />
            Tighter?
          </label>
        </div>
        <div>
          <label key="mui">
            <input type="radio" name="designPref" value="mui" checked={designPref === 'mui'}
              onChange={e => {
                if (!e.target.checked) {
                  return
                }
                setDesignPref(e.target.value as any)
              }}
            />
            use mui components
          </label>
          <label key="ant">
            <input type="radio" name="designPref" value="ant" checked={designPref === 'ant'}
              onChange={e => {
                if (!e.target.checked) {
                  return
                }
                setDesignPref(e.target.value as any)
              }} />
            use ant components
          </label>
        </div>
        <button type="submit">submit</button>
      </form>
    </div>
  )
}