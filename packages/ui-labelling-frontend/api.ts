import { AnnotationPayload } from "./utils/type"


const throwIfErrorStatus = (r: Response) => {
  if (r.ok) {
    return r.json()
  }
  return Promise.reject(r)
}

export const getAnnotations = () => {
  return (
    fetch('/api/annotation?published=0')
      .then(throwIfErrorStatus)
  )
}

export const getPublishedAnnotations = () => {
  return (
    fetch('/api/annotation?published=1')
      .then(throwIfErrorStatus)
  )
}

export const getAnnotation = (id: number) => {
  return (
    fetch(`/api/annotation/${id}`)
      .then(throwIfErrorStatus)
  )
}

export const deleteAnnotation = (id: number) => {
  return (
    fetch(`/api/annotation/${id}`, { method: 'DELETE' })
      .then(throwIfErrorStatus)
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
    .then(throwIfErrorStatus)
  )
}

export const publishAnnotation = (id: number) => {
  return fetch(`/api/annotation/publish/${id}`, { method: 'PUT' })
    .then(throwIfErrorStatus)
}

export const unPublishAnnotation = (id: number) => {
  return fetch(`/api/annotation/unpublish/${id}`, { method: 'PUT' })
    .then(throwIfErrorStatus)
}