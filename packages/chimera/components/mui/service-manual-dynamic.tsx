import { ServiceManualLabel } from "ui-labelling-shared"
import { Rect } from "../../util/generator"

export const DynamicMuiComponent = ({
  label,
  children,
  rect,
} : {
  label: ServiceManualLabel
  children?: React.ReactNode
  rect?: Rect
}) => {
  switch(label) {
    default:
      console.log('not supported!')
      return null
  }
}