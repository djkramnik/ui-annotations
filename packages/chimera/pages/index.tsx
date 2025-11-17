import { InteractiveLabel } from "ui-labelling-shared"
import { useComponent } from "../hooks/useComponent"
import { FilePicker, FilePickerSlim } from "../components/vanilla/filepicker"
import { VanillaTheme } from "../components/vanilla/type"
import { useRandomTheme } from "../hooks/useRandomTheme"
import { useMemo } from "react"
import { RandomVariation } from "../components/vanilla/variation"
import { VanillaButton } from "../components/vanilla/button"
import { VanillaVideo } from "../components/vanilla/video"

const VanillaComponent = ({ theme }: { theme: VanillaTheme }) => {
  const component = useComponent()

  switch(component) {
    case InteractiveLabel.video:
      return (
        <VanillaVideo />
      )
    case InteractiveLabel.button:
      return (
        <VanillaButton theme={theme}>
          Save
        </VanillaButton>
      )
    case InteractiveLabel.filepicker:
      return (
        <RandomVariation variations={[
          FilePickerSlim,
          FilePicker
        ]}
        theme={theme}
        />
      )
    default:
      return null
  }
}

const VanillaComponentPage = () => {
  const theme = useMemo(() => useRandomTheme(), [])

  return (
    <div id="wrapper" style={{ width: 'fit-content',

     }}>
      <VanillaComponent theme={theme} />
    </div>
  )
}

export default VanillaComponentPage