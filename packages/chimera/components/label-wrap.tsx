import { InteractiveLabel } from "ui-labelling-shared"

export const LabelWrap = ({
  label,
  children
}: {
  label: InteractiveLabel
  children?: React.ReactNode
}) => {
  return (
    <div data-label={`label_${label}`} style={{ width: 'fit-content' }}>
      {children}
    </div>
  )
}