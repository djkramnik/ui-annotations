import { useMemo } from "react"
import { annotationLabels, serviceManualLabel } from "ui-labelling-shared"

export const useLabels = (tag?: string) => {
  const labels = useMemo(() => {
    return Object.keys(tag === 'service_manual' ? serviceManualLabel : annotationLabels)
  }, [tag])
  return labels
}