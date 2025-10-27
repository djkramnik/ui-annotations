import { theme as antdTheme } from "antd"
import type { ThemeConfig } from "antd/es/config-provider/context"
import { randInt, randomPick } from "../../util/random"
import { getRandomLocalFont } from "../../util/faker/font"
import { DARK_COLOR_SCHEMES, LIGHT_COLOR_SCHEMES } from "../../util/faker/color"
import { adjustColor } from "../../util/color"

export function randomAntTheme(): ThemeConfig {
  const dark = Math.random() < 0.4
  const {
    primary,
    // secondary, // optional: map to colorInfo if you want
    bgDefault,
    textPrimary,
    textSecondary,
  } = dark ? randomPick(DARK_COLOR_SCHEMES) : randomPick(LIGHT_COLOR_SCHEMES)

  // Slight separation between base and containers (elevated/paper)
  const bgPaper = adjustColor(bgDefault, randInt(0, 5) * (dark ? 1 : -1))

  const fontFamily =
    Math.random() > 0.6
      ? `"Fira Sans","Roboto","Helvetica","Arial",sans-serif`
      : getRandomLocalFont()

  const borderRadius = [4, 6, 8, 10, 12][randInt(0, 4)]

  const algorithm = dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm

  const config: ThemeConfig = {
    cssVar: true,
    algorithm,
    token: {
      // Core brand & text
      colorPrimary: primary,
      colorText: textPrimary,
      colorTextSecondary: textSecondary,

      // Backgrounds
      colorBgBase: bgDefault,       // app/page background
      colorBgContainer: bgPaper,    // cards, inputs
      colorBgElevated: bgPaper,     // popups: dropdowns, modals, pickers

      // Borders / control radius / font
      borderRadius,
      fontFamily,

      // (optional) tighten borders to match your style
      colorBorder: dark ? "#2A2A2A" : "#E5E7EB",
      colorBorderSecondary: dark ? "#2F2F2F" : "#EAECEF",
    },

    // Component-scoped tweaks to ensure readability for inputs & pickers
    components: {
      Input: {
        colorBgContainer: bgPaper,
        colorText: textPrimary,
        colorTextPlaceholder: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)",
        colorBorder: dark ? "#3a3a3a" : "#D1D5DB",
        activeBorderColor: primary,
        hoverBorderColor: primary,
        borderRadius,
      },
      DatePicker: {
        colorBgContainer: bgPaper,
        colorText: textPrimary,
        colorTextPlaceholder: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)",
        colorBorder: dark ? "#3a3a3a" : "#D1D5DB",
        activeBorderColor: primary,
        hoverBorderColor: primary,
        borderRadius,
      },
      Calendar: {
        colorBgContainer: bgPaper,
        colorText: textPrimary,
        colorTextDisabled: dark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.25)",
        colorPrimary: textPrimary,
        borderRadiusLG: borderRadius,
      },
      Popover: {
        colorBgElevated: bgPaper,
        colorText: textPrimary,
        borderRadius,
      },
      Dropdown: {
        controlItemBgHover: adjustColor(bgPaper, dark ? 6 : -6),
      },
      Select: {
        colorBgContainer: bgPaper,
        colorText: textPrimary,
        colorBorder: dark ? "#3a3a3a" : "#D1D5DB",
        optionSelectedBg: adjustColor(bgPaper, dark ? 8 : -8),
      },
      Modal: {
        colorBgElevated: bgPaper,
        colorText: textPrimary,
        borderRadiusLG: borderRadius + 2,
      },
      Tooltip: {
        colorBgSpotlight: adjustColor(bgPaper, dark ? 12 : -12),
      },
    },
  }

  return config
}
