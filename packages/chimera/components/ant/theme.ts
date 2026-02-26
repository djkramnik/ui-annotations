import { theme as antdTheme } from "antd"
import type { ThemeConfig } from "antd/es/config-provider/context"
import { randInt, randomPick } from "../../util/random"
import { DARK_COLOR_SCHEMES, LIGHT_COLOR_SCHEMES } from "../../util/faker/color"
import { adjustColor } from "../../util/color"

type FontManifest = {
  selectedFamilies?: string[]
  fonts?: Array<{ family: string }>
}

export function randomAntTheme(fontManifest?: FontManifest): ThemeConfig {
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

  const fontFamily = pickFontFamily(fontManifest)

  const borderRadius = [4, 6, 8, 10, 12][randInt(0, 4)]

  const algorithm = dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm

  // --- NEW: decide whether Select should use an accent border color
  const useAccentSelectBorder = Math.random() < 1 / 3

  const baseBorderColor = dark ? "#2A2A2A" : "#E5E7EB"
  const baseBorderSecondary = dark ? "#2F2F2F" : "#EAECEF"

  // start with neutral select borders
  const neutralSelectBorder = dark ? "#3a3a3a" : "#D1D5DB"

  // accent border for Select, derived from primary (slightly shifted so it’s not identical)
  const accentSelectBorder = adjustColor(primary, dark ? 6 : -6)

  const selectBorderColor = useAccentSelectBorder
    ? accentSelectBorder
    : neutralSelectBorder

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

      // Keep global borders neutral; Select will override if needed
      colorBorder: baseBorderColor,
      colorBorderSecondary: baseBorderSecondary,
    },

    // Component-scoped tweaks to ensure readability for inputs & pickers
    components: {
      Input: {
        colorBgContainer: bgPaper,
        colorText: textPrimary,
        colorTextPlaceholder: dark
          ? "rgba(255,255,255,0.45)"
          : "rgba(0,0,0,0.35)",
        colorBorder: neutralSelectBorder,
        activeBorderColor: primary,
        hoverBorderColor: primary,
        borderRadius,
      },
      DatePicker: {
        colorBgContainer: bgPaper,
        colorText: textPrimary,
        colorTextPlaceholder: dark
          ? "rgba(255,255,255,0.45)"
          : "rgba(0,0,0,0.35)",
        colorBorder: neutralSelectBorder,
        activeBorderColor: primary,
        hoverBorderColor: primary,
        borderRadius,
      },
      Calendar: {
        colorBgContainer: bgPaper,
        colorText: textPrimary,
        colorTextDisabled: dark
          ? "rgba(255,255,255,0.30)"
          : "rgba(0,0,0,0.25)",
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

        // 👇 This is now sometimes neutral, sometimes accent:
        colorBorder: selectBorderColor,
        hoverBorderColor: selectBorderColor,
        activeBorderColor: selectBorderColor,

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

function pickFontFamily(fontManifest?: FontManifest): string {
  const families = new Set<string>()

  for (const family of fontManifest?.selectedFamilies || []) {
    const cleaned = family.trim()
    if (cleaned) {
      families.add(cleaned)
    }
  }

  for (const item of fontManifest?.fonts || []) {
    const cleaned = item.family.trim()
    if (cleaned) {
      families.add(cleaned)
    }
  }

  if (families.size > 0) {
    const preferred = Array.from(families).map(function toQuoted(family) {
      return `'${family.replace(/'/g, "\\'")}'`
    })
    preferred.push(
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "Roboto",
      "Helvetica",
      "Arial",
      "sans-serif",
    )
    return preferred.join(",")
  }

  return "'Fira Sans','Roboto','Helvetica','Arial',sans-serif"
}
