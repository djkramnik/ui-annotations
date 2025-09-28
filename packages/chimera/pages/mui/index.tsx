import { ThemeProvider, CssBaseline } from "@mui/material"
import theme from "../../components/mui/theme"
import { useRouter } from 'next/router'
import { InteractiveLabel } from 'ui-labelling-shared'
import { MuiRadioGroup } from '../../components/mui/radio'

const MuiComponent = () => {
  const { query } = useRouter()
  const component = String(query.component) as InteractiveLabel

  switch(component) {
    case InteractiveLabel.radio:
      return (
        <MuiRadioGroup
          title="Gender"
          options={['Male', 'Female', 'Binary', 'Zim']}
          selected={1}
        />
      )
    default:
      return 'hi'
  }
}

export default () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{
        backgroundColor: theme.palette.background.default,
        width: '100vw',
        height: '100vh'
      }}>
        <div id="wrapper" style={{ width: 'fit-content' }}>
          <MuiComponent />
        </div>
      </div>
    </ThemeProvider>
  )
}