import { useRouter } from 'next/router'
import { InteractiveLabel } from "ui-labelling-shared"

export const useComponent = (): (InteractiveLabel | null) => {
  const { query } = useRouter()
  return query.component
    ? String(query.component) as InteractiveLabel
    : null
}