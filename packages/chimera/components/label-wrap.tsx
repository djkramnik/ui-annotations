import { CSSProperties } from "react"
import { InteractiveLabel } from "ui-labelling-shared"

export const LabelWrap = ({
  label,
  children,
  style,
}: {
  label: InteractiveLabel
  children?: React.ReactNode
  style?: CSSProperties
}) => {
  return (
    <span data-label={`label_${label}`}
      style={{ width: 'fit-content', ...style }}>
      {children}
    </span>
  )
}