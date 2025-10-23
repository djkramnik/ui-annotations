import { useEffect, useRef, useState } from "react"
import { PreviewSchema, readPreviewSchema } from "../../util/localstorage"
import { PreviewAnnotation } from "../../components/generator/preview-annotation"
import { GridRenderer } from "../../components/generator/dynamicGrid"

const PreviewPage = () => {
  const fetched = useRef<boolean>(false)
  const [schema, setSchema] = useState<PreviewSchema | null>(null)

  useEffect(() => {
    if (fetched.current) {
      return
    }
    const maybeSchema = readPreviewSchema()
    fetched.current = true
    if (maybeSchema === null) {
      window.alert('try refresh when you got the goods')
      return
    }
    setSchema(maybeSchema)
  }, [setSchema])

  if (!schema) {
    return null
  }
  return (
    <div>
      <SchemaMeta schema={schema} />
      <hr />
      <GridRenderer data={schema} showDebugBorders />
    </div>
  )
}

export default PreviewPage

function SchemaMeta({
  schema
}: {
  schema: PreviewSchema
}) {
  return (
    <div>
      <h3>Source Annotation:</h3>
      <PreviewAnnotation annotations={schema.annotations} />
    </div>
  )
}