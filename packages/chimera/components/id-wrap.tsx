import { InteractiveLabel } from "ui-labelling-shared"

export const IdWrap = ({
  label,
  children
}: {
  label: InteractiveLabel
  children?: React.ReactNode
}) => {
  return (
    <div id={`label_${label}`} style={{ width: 'fit-content' }}>
      {children}
    </div>
  )
}