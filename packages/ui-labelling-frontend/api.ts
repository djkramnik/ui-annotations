import {
  Annotation,
  AnnotationLabel,
  Screenshot,
  YoloPredictResponse
} from "ui-labelling-shared"
import { AnnotationBox, parseAnnotationsFromYoloResponse } from "./utils/yolo"

const jsonOrThrow = (r: Response) => {
  if (r.ok) {
    return r.json()
  }
  return Promise.reject(r)
}

export type CountBreakdown = Record<AnnotationLabel | 'url', number>

export type Analytics = {
  'published': CountBreakdown
  'draft': CountBreakdown
}

export type InteractiveRecord = {
  id: number
  true_id: string
  annotationId: number | null
  screenshot: ArrayBuffer
  label: string | null
  metadata?: Record<string, any> | null
}

export const getOcr = (id: number): Promise<{ screenshot: number[]; text: string }> => {
  return (
    fetch(`/api/ocr/${id}`)
      .then(jsonOrThrow)
  )
}

// interactive apis

export const getInteractiveAnalytics = (): Promise<{
  labelCounts: {
    label: string
    count: number
  }[]
}> => {
  return (
    fetch(`/api/interactive/analytics`)
      .then(jsonOrThrow)
  )
}

export const getInteractive = (id: number): Promise<{ screenshot: number[]; label: string | null }> => {
  return (
    fetch(`/api/interactive/${id}`)
      .then(jsonOrThrow)
  )
}

export const getInteractivePage = ({
  page,
  unlabelled,
  label,
  synth,
}: {
  page: number
  unlabelled?: boolean
  label?: string
  synth?: boolean
}): Promise<{
  items: InteractiveRecord[]
  total: number
}> => {
  console.log('getInteractivePage:', ' page=', page, ' unlabelled=', unlabelled, ' label=', label)
  return (
    fetch(`/api/interactive?page=${page}${unlabelled === false ? '' : '&unlabelled=true'}${label ? `&label=${label}` : ''}${synth ? `&synth=true` : ''}`)
      .then(jsonOrThrow)
  )
}

export const updateInteractive = (id: number, label: string | null) => {
  return (
    fetch(`/api/interactive/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        label
      })
    })
  )
}

export const batchUpdateInteractive = (updates: Array<{id: number, label: string | null}>) => {
  return fetch(`/api/interactive/batch-update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ updates })
  }).then(jsonOrThrow)
}

export const deleteInteractive = (id: number) => {
  return fetch(`/api/interactive/${id}`, { method: 'DELETE' }).then(jsonOrThrow)
}

// end interactive apis

export const occludeScreenshot = (id: number, rect: Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>)
  : Promise<{ updatedScreen: ArrayBuffer }> => {
    return (
      fetch(`/api/util/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rect })
      })
      .then(jsonOrThrow)
    )
  }

export const getAnnotations = (tag?: string, synthetic?: boolean) => {
  return (
    fetch(`/api/screenshot?published=0${tag ? `&tag=${tag}` : ''}${synthetic ? `&synthetic=true` : ''}`)
      .then(jsonOrThrow)
  )
}

export const getPublishedAnnotations = (tag?: string) => {
  return (
    fetch(`/api/screenshot?published=1${tag ? `&tag=${tag}` : ''}`)
      .then(jsonOrThrow)
  )
}

export const getAnnotation = (id: number): Promise<{
  data: Screenshot
  next: number | null
  prev: number | null
}> => {
  return (
    fetch(`/api/screenshot/sequence/${id}`)
      .then(jsonOrThrow)
  )
}

export const deleteAnnotation = (id: number) => {
  return (
    fetch(`/api/screenshot/${id}`, { method: 'DELETE' })
      .then(jsonOrThrow)
  )
}

export const updateAnnotation = (
  id: number,
  payload: Annotation[]
) => {
  return (
    fetch(`/api/screenshot/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ annotations: payload }),
    })
    .then(jsonOrThrow)
  )
}

export const publishAnnotation = (id: number) => {
  return fetch(`/api/screenshot/publish/${id}`, { method: 'PUT' })
    .then(jsonOrThrow)
}

export const unPublishAnnotation = (id: number) => {
  return fetch(`/api/screenshot/unpublish/${id}`, { method: 'PUT' })
    .then(jsonOrThrow)
}

export type AnnotationWithScreen = Annotation & {
  screenshot: {
    image_data: ArrayBuffer
    id: number
    view_width: number
    view_height: number
  }
  clean?: boolean
}

// todo: rename the other things screenshot
export const getEditableAnnotations = (page: number, tag?: string): Promise<{
  total: number
  records: AnnotationWithScreen[]
}> => {
  return fetch(`/api/annotation?published=false&page=${page}${tag ? `&tag=${tag}` : ''}`).then(jsonOrThrow)
}

// DYK - this also supports fetching unpublished records when passing &published=false
export const patchSingleAnnotation = (id: string, body: Pick<Annotation, 'rect' | 'label' | 'text_content'> & { clean?: boolean }) => {
  return fetch(`/api/annotation/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      annotation: body // ridiculous inconsistency
    })
  }).then(jsonOrThrow)
}

export const deleteSingleAnnotation = (id: string) => {
    return fetch(`/api/annotation/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(jsonOrThrow)
}

// yolo calls.

export const getYoloPreds = ({
  screen,
  model,
  conf,
  iou,
  imgsz,
}: {
  screen: Pick<Screenshot, 'image_data' | 'view_height' | 'view_width'>
  model: string
  conf?: number
  iou?: number
  imgsz?: number
}): Promise<AnnotationBox[]> => {
  const base64 = Buffer.from(screen.image_data).toString('base64')

  return fetch('/yolo/yolo_predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conf,
      iou,
      imgsz,
      model_name: model,
      image_base64: base64,
    })
  })
  .then(jsonOrThrow)
  .then(_r => {
    const resp = _r as unknown as YoloPredictResponse
    return parseAnnotationsFromYoloResponse({
      viewHeight: screen.view_height,
      viewWidth: screen.view_width,
      response: resp
    })
  })
}

export const getYoloModels = (): Promise<string[]> => {
  return fetch('/yolo/health')
    .then(jsonOrThrow)
    .then(_r => {
      const resp = _r as unknown as { available_models: string[] }
      return resp.available_models
    })
}

