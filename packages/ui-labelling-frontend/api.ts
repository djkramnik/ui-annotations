import {
  Annotation,
  AnnotationLabel,
  Screenshot
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

export const getInteractivePage = ({
  page,
  unlabelled,
  label,
}: {
  page: number
  unlabelled?: boolean
  label?: string
}): Promise<{
  items: InteractiveRecord[]
  total: number
}> => {
  return (
    fetch(`/api/interactive?page=${page}${unlabelled === false ? '' : '&unlabelled=true'}${label ? `&label=${label}` : ''}`)
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

export const getAnalytics = (tag?: string): Promise<{ data: Analytics}> => {
  return (
    fetch(`/api/screenshot/analytics${tag ? `?tag=${tag}` : ''}`)
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