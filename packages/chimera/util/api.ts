import { Annotations } from "ui-labelling-shared"

export const fetchAnnotationById = async (id: number): Promise<Annotations | null> => {
  try {
    const resp = await fetch(`/api/annotation/${id}`)
    if (!resp.ok) {
      console.error('could not fetch annotation with id ', id)
      return null
    }
    const { data } = (await resp.json()) as { data: Annotations }
    return data
  } catch(e) {
    console.error(e)
    return null
  }
}

