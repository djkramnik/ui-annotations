import { ThemeProvider, CssBaseline } from "@mui/material"
import { InteractiveLabel } from 'ui-labelling-shared'
import { MuiRadioGroup } from '../../components/mui/radio'
import { useComponent } from "../../hooks/useComponent"
import MuiDatePicker from "../../components/mui/datepicker"
import { useMemo } from "react"
import { randomMuiTheme } from "../../components/mui/theme"
import { MuiSelectableCard } from "../../components/mui/selectable-card"
import { RandomMuiIcon } from "../../components/mui/icon"

const MuiComponent = () => {
  const component = useComponent()

  switch(component) {
    case InteractiveLabel.radio:
      return (
        <MuiRadioGroup
          title="Gender"
          options={['Male', 'Female', 'Binary', 'Zim']}
          selected={1}
        />
      )
    case InteractiveLabel.selectablecard:
      return (
        <MuiSelectableCard />
      )
    case InteractiveLabel.datepicker:
      return (
        <MuiDatePicker />
      )
    default:
      return null
  }
}
const theme = randomMuiTheme()

export default () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{
        width: '100vw',
        height: '100vh',
        padding: '12px'
      }}>
        <div id="wrapper" style={{ width: 'fit-content' }}>
          <MuiComponent />
        </div>
      </div>
    </ThemeProvider>
  )
}