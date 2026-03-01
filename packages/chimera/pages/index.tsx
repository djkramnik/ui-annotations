import { InteractiveLabel } from "ui-labelling-shared"
import { useComponent } from "../hooks/useComponent"
import { FilePicker, FilePickerSlim } from "../components/vanilla/filepicker"
import { VanillaTheme } from "../components/vanilla/type"
import { useRandomTheme } from "../hooks/useRandomTheme"
import { useEffect, useState } from "react"
import { RandomVariation } from "../components/vanilla/variation"
import { VanillaButton } from "../components/vanilla/button"
import { VanillaVideo } from "../components/vanilla/video"
import {
  applyPreferredFamily,
  loadInlineFontBundleStyles,
  loadRandomFontBundle,
} from "../util/font-bundle"

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
    case InteractiveLabel.file_drop:
      return (
        <FilePicker theme={theme} />
      )
    case InteractiveLabel.filepicker:
      return (
        <FilePickerSlim theme={theme} />
      )
    default:
      return null
  }
}

const VanillaComponentPage = () => {
  const [theme, setTheme] = useState(() => useRandomTheme())

  useEffect(() => {
    let mounted = true

    async function loadFontTheme(): Promise<void> {
      const bundle = await loadRandomFontBundle()
      if (!bundle) {
        console.warn('[chimera] No font bundles available from /api/fonts/random')
        if (mounted) {
          setTheme(useRandomTheme())
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
        setTheme(useRandomTheme(applyPreferredFamily(manifest, family)))
      } catch (_error) {
        if (mounted) {
          setTheme(useRandomTheme())
        }
      }
    }

    void loadFontTheme()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div id="wrapper" style={{ width: 'fit-content',

     }}>
      <VanillaComponent theme={theme} />
    </div>
  )
}

export default VanillaComponentPage
