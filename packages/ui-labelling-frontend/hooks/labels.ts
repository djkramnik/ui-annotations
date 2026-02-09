import { useEffect, useMemo, useState } from "react"
import { annotationLabels, serviceManualLabel } from "ui-labelling-shared"

export const useLabels = (tag: string) => {
  const labels = useMemo(() => {
    return Object.keys(tag === 'service_manual' ? serviceManualLabel : annotationLabels)
  }, [tag])
  return labels
}

export const useLabelSet = (tag: string): string[] => {
  const [labels, setLabels] = useState<string[]>([])
  useEffect(() => {
    async function fetchTags(tag: string) {
      const resp = await fetch(`/api/screenshot/tag/${encodeURIComponent(tag)}`)
      if (!resp.ok) {
        throw Error('error fetching labels for tag')
      }
      setLabels((await resp.json()).data)
    }
    fetchTags(tag)
  }, [tag, setLabels])

  return labels
}