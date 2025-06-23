export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export interface AnnotationPayload {
  annotations: {
    id: string
    label: string
    rect: { x: number; y: number; width: number; height: number }
  }[]
}

export interface Annotations {
  url: string
  payload: AnnotationPayload
  screenshot: ArrayBuffer
  scrollY: number
  viewHeight: number
  viewWidth: number
  date: string
  id: number
  published: | 0 | 1
}

export type Annotation = AnnotationPayload['annotations'][0]