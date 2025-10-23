// specify an id, perhaps get a small preview of the screenshot,
// run infer-layout (with or without tighten)
// generate data for the preview (which then gets saved in local storage)

import { Box, Container } from "@mui/material"
import { FormEvent, useCallback, useState } from "react"
import { Annotations } from "ui-labelling-shared"
import { fetchAnnotationById } from "../../util/api"

const GenerateFromExample = () => {
  const [annoId, setAnnoId] = useState<string>('')
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
              <PreviewAnnotation annotations={annotations} />
              <GenSyntheticForm annotations={annotations} />
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
  return 'preview annotation here'
}

function GenSyntheticForm({
  annotations
}: {
  annotations: Annotations
}) {
  return 'gen synthetic form here'
}