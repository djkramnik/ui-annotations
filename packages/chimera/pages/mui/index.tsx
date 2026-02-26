import { ThemeProvider, CssBaseline } from "@mui/material"
import { useEffect, useState } from 'react'
import { InteractiveLabel } from 'ui-labelling-shared'
import { MuiRadioGroup } from '../../components/mui/radio'
import { useComponent } from "../../hooks/useComponent"
import MuiDatePicker from "../../components/mui/datepicker"
import { randomMuiTheme } from "../../components/mui/theme"
import { MuiAccordion } from '../../components/mui/accordion'
import { MuiTextarea } from "../../components/mui/textarea"
import { MuiToggle } from "../../components/mui/toggle"
import { MuiSlider } from "../../components/mui/slider"
import { MuiAvatar } from "../../components/mui/avatar"
import { MuiPagination } from "../../components/mui/pagination"
import { MuiDropdown } from "../../components/mui/dropdown"
import { MuiTextInput } from "../../components/mui/textinput"
import { MuiButtonSet } from "../../components/mui/button"
import { AllMuiIconsGrid } from "../../components/mui/icon"
import { MuiIconsGridAlt } from '../../components/mui/iconbutton'
import { MuiCheckboxGroup } from '../../components/mui/checkbox'
import {
  applyPreferredFamily,
  loadInlineFontBundleStyles,
  loadRandomFontBundle,
} from '../../util/font-bundle'

const MuiComponent = () => {
  const component = useComponent()

  switch(component) {
    case InteractiveLabel.iconbutton:
      return <MuiIconsGridAlt />
    case InteractiveLabel.button:
      return <MuiButtonSet />
    case InteractiveLabel.textinput:
      return <MuiTextInput />
    case InteractiveLabel.dropdown:
      return <MuiDropdown open={false} />
    case InteractiveLabel.dropdown_menu:
      return <MuiDropdown open={true} />
    case InteractiveLabel.pagination:
      return <MuiPagination />
    case InteractiveLabel.avatar:
      return <MuiAvatar />
    case InteractiveLabel.slider:
      return (
        <MuiSlider />
      )
    case InteractiveLabel.toggle:
      return (
        <MuiToggle />
      )
    case InteractiveLabel.textarea:
      return (
        <MuiTextarea />
      )
    case InteractiveLabel.accordion:
      return (
        <MuiAccordion />
      )
    case InteractiveLabel.checkbox:
      return (
        <MuiCheckboxGroup
          title="Gender"
          options={['Male', 'Female', 'Binary', 'Zim']}
          selected={[1]}
        />
      )
    case InteractiveLabel.radio:
      return (
        <MuiRadioGroup
          title="Gender"
          options={['Male', 'Female', 'Binary', 'Zim']}
          selected={1}
        />
      )
    case InteractiveLabel.datepicker:
      return (
        <MuiDatePicker />
      )
    case InteractiveLabel.calendar:
      return <MuiDatePicker open={true} />
    default:
      return null
  }
}

export default () => {
  const [theme, setTheme] = useState(() => randomMuiTheme())

  useEffect(() => {
    let mounted = true

    async function loadFontTheme(): Promise<void> {
      const bundle = await loadRandomFontBundle()
      if (!bundle) {
        console.warn('[chimera] No font bundles available from /api/fonts/random')
        if (mounted) {
          setTheme(randomMuiTheme())
        }
        return
      }

      const { slug, family, cssText, manifest } = bundle
      console.log(`[chimera] Using font bundle id: ${bundle.id}`)
      console.log(`[chimera] Using font folder: ${slug || '(none)'}`)
      console.log(`[chimera] Selected font family: ${family}`)

      try {
        loadInlineFontBundleStyles(cssText)
        if (!mounted) {
          return
        }
        setTheme(randomMuiTheme(applyPreferredFamily(manifest, family)))
      } catch (_error) {
        if (mounted) {
          setTheme(randomMuiTheme())
        }
      }
    }

    void loadFontTheme()

    return () => {
      mounted = false
    }
  }, [])

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
