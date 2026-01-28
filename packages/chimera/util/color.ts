/**
 * Lighten or darken a hex color by a given percent.
 * @param hex - e.g. "#3B82F6"
 * @param percent - positive to lighten, negative to darken (e.g. 10 or -10)
 * @returns adjusted hex string
 */
export function adjustColor(hex: string, percent: number): string {
  // Normalize and strip '#'
  let color = hex.replace(/^#/, '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }

  const num = parseInt(color, 16);
  const amt = Math.round(2.55 * percent);

  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));

  return (
    '#' +
    (0x1000000 + (R << 16) + (G << 8) + B)
      .toString(16)
      .slice(1)
      .toUpperCase()
  );
}

// util/color.ts
type Rgb = { r: number; g: number; b: number }

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x))
}

function cssToRgb(css: string): Rgb | null {
  const s = css.trim().toLowerCase()

  // rgb() / rgba()
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/)
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }

  // hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  const hex = s.startsWith("#") ? s.slice(1) : ""
  if (hex) {
    const h =
      hex.length === 3 || hex.length === 4
        ? hex.split("").map((c) => c + c).join("")
        : hex.length === 6 || hex.length === 8
          ? hex.slice(0, 6)
          : null
    if (!h) return null
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    }
  }

  // For named colors etc, let the browser resolve it
  if (typeof document !== "undefined") {
    const el = document.createElement("div")
    el.style.color = s
    document.body.appendChild(el)
    const resolved = getComputedStyle(el).color
    document.body.removeChild(el)
    return cssToRgb(resolved)
  }

  return null
}

// WCAG relative luminance
function srgbToLinear(c: number) {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function luminance(rgb: Rgb): number {
  const R = srgbToLinear(rgb.r)
  const G = srgbToLinear(rgb.g)
  const B = srgbToLinear(rgb.b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function isDarkCssColor(css: string, threshold = 0.5): boolean {
  const rgb = cssToRgb(css)
  if (!rgb) return false // default to "light-ish"
  return luminance(rgb) < threshold
}

/**
 * Generate a random HSL color with luminance constrained to "dark" or "light".
 * - Dark: keep L in [0.08..0.28]
 * - Light: keep L in [0.78..0.95]
 * Saturation kept moderate to avoid neon clashes.
 */

export function randomBgCssSimilarLightness(isDark: boolean): string {
  const h = Math.floor(Math.random() * 360)
  const s = isDark ? 35 + Math.random() * 25 : 20 + Math.random() * 25
  const l = isDark ? 8 + Math.random() * 20 : 78 + Math.random() * 17

  // ✅ commas — MUI parses reliably
  return `hsl(${h}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`
}

