import { Annotations } from "ui-labelling-shared"
import { Rect } from "./generator"

export type PreviewSchema = {
  annotations: Annotations
  designPref: 'mui' | 'ant'
  layout: Array<{
    rect: Rect
    components: string[]
  }>
  contentBounds: Rect
}

const previewKey = 'preview_schema'
export const writePreviewSchema = (schema: PreviewSchema) => {
  localStorage.setItem(previewKey, JSON.stringify(schema))
}
export const readPreviewSchema = (): PreviewSchema | null => {
  const maybeSchema = localStorage.getItem(previewKey)
  if (typeof maybeSchema === 'string') {
    try {
      return JSON.parse(maybeSchema) as PreviewSchema
    } catch(e) {
      console.error('error reading from local storage', e)
      return null
    }
  }
  return null
}