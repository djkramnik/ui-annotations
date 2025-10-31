import { Screenshot, Rect } from "ui-labelling-shared"

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

export const fetchCrops = async ({
  minRatio,
  maxRatio,
  total,
  label
}: {
  minRatio: number
  maxRatio: number
  total?: number
  label?: string
}): Promise<{ screenshot: ArrayBuffer; aspectRatio: number }[]> => {
  try {
    const resp = await fetch(`/api/screenshot/crop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ minRatio, maxRatio, total, label })
    })
    if (!resp.ok) {
      throw Error(`failed to fetch image crops: ${resp.status}`)
    }
    const { data } = (await resp.json()) as { data: { screenshot: ArrayBuffer; aspectRatio: number }[] }
    return data
  } catch(e) {
    console.error(e)
    throw e
  }
}

export const fetchScreenshotById = async (id: number): Promise<Screenshot | null> => {
  try {
    const resp = await fetch(`/api/annotation/${id}`)
    if (!resp.ok) {
      console.error('could not fetch annotation with id ', id)
      return null
    }
    const { data } = (await resp.json()) as { data: Screenshot }
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

