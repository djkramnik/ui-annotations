import { AnnotationPayload } from "ui-labelling-shared"

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type Annotation = AnnotationPayload['annotations'][0]

export type PageMode = | 'initial' | 'toggle' | 'draw' | 'danger' | 'occlude'
export type ToggleState = | 'delete' | 'adjust' | 'label'
export type DangerState = | 'publish' | 'delete' | 'update'