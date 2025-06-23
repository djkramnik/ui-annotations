import { useMemo } from "react"
import { annotationLabels } from "ui-labelling-shared"

export const useLabels = () => {
  const labels = useMemo(() => {
    return Object.keys(annotationLabels)
  }, [])
  return labels
}