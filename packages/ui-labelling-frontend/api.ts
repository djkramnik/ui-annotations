export const getAnnotations = () => {
  return (
    fetch('/api/annotation?published=0')
      .then(r => r.json())
  )
}

export const getPublishedAnnotations = () => {
  return (
    fetch('/api/annotation?published=1')
      .then(r => r.json())
  )
}

export const getAnnotation = (id: number) => {
  return (
    fetch(`/api/annotation/${id}`)
      .then(r => r.json())
  )
}

export const deleteAnnotation = (id: number) => {
  return (
    fetch(`/api/annotation/${id}`, { method: 'DELETE' })
      .then(r => r.json())
  )
}

export const publishAnnotation = (id: number) => {
  return fetch(`/api/annotation/publish/${id}`, { method: 'PUT' })
    .then(r => r.json())
}

export const unPublishAnnotation = (id: number) => {
  return fetch(`/api/annotation/unpublish/${id}`, { method: 'PUT' })
    .then(r => r.json())
}