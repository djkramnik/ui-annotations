import { Annotations } from "ui-labelling-shared"
import { Rect } from "./generator"

export type TightenResponse = {
  id: string
  rect: Rect,
  similar: {
    ok: boolean
    aspectDrift: number
    areaRatio: number
    original: Rect
    candidate: Rect
  }
}

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

export const fetchTighterAnnotations = async (id: number): Promise<TightenResponse[] | null> => {
  try {
    const resp = await fetch(`/api/screenshot/tighten/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (!resp.ok) {
      console.error('could not get any tighter', id)
      return null
    }
    return resp.json() as Promise<TightenResponse[]>
  } catch(e) {
    console.error(e)
    return null
  }
}

