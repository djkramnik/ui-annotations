import {
  AnnotationLabel,
  AnnotationPayload,
  Annotations,
  annotationLabels
} from "ui-labelling-shared"

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

export const getInteractivePage = (page: number, unlabelled?: boolean): Promise<{
  items: InteractiveRecord[]
  total: number
}> => {
  return (
    fetch(`/api/interactive?page=${page}${unlabelled === false ? '' : '&unlabelled=true'}`)
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
      fetch(`/api/screenshot/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rect })
      })
      .then(jsonOrThrow)
    )
  }

export const getAnalytics = (tag?: string): Promise<{ data: Analytics}> => {
  return (
    fetch(`/api/annotation/analytics${tag ? `?tag=${tag}` : ''}`)
      .then(jsonOrThrow)
  )
}

export const getAnnotations = (tag?: string) => {
  return (
    fetch(`/api/annotation?published=0${tag ? `&tag=${tag}` : ''}`)
      .then(jsonOrThrow)
  )
}

export const getPublishedAnnotations = (tag?: string) => {
  return (
    fetch(`/api/annotation?published=1${tag ? `&tag=${tag}` : ''}`)
      .then(jsonOrThrow)
  )
}

export const getAnnotation = (id: number): Promise<{data: Annotations}> => {
  return (
    fetch(`/api/annotation/${id}`)
      .then(jsonOrThrow)
  )
}

export const deleteAnnotation = (id: number) => {
  return (
    fetch(`/api/annotation/${id}`, { method: 'DELETE' })
      .then(jsonOrThrow)
  )
}

export const updateAnnotation = (
  id: number,
  payload: Pick<AnnotationPayload, 'annotations'>
) => {
  return (
    fetch(`/api/annotation/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    })
    .then(jsonOrThrow)
  )
}

export const publishAnnotation = (id: number) => {
  return fetch(`/api/annotation/publish/${id}`, { method: 'PUT' })
    .then(jsonOrThrow)
}

export const unPublishAnnotation = (id: number) => {
  return fetch(`/api/annotation/unpublish/${id}`, { method: 'PUT' })
    .then(jsonOrThrow)
}