import { InteractiveLabel } from "ui-labelling-shared"
import { useComponent } from "../hooks/useComponent"
import { FilePicker } from "../components/vanilla/filepicker"
import { VanillaTheme } from "../components/vanilla/type"
import { useRandomTheme } from "../hooks/useRandomTheme"

const VanillaComponent = ({ theme }: { theme: VanillaTheme }) => {
  const component = useComponent()
  switch(component) {
    case InteractiveLabel.filepicker:
      return <FilePicker theme={theme} />
    default:
      return 'unsupported component mate'
  }
}

const VanillaComponentPage = () => {
  const theme = useRandomTheme()
  return (
    <div id="wrapper" style={{ width: 'fit-content' }}>
      <VanillaComponent theme={theme} />
    </div>
  )
}

export default VanillaComponentPage