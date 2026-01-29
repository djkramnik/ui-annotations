import * as React from 'react'
import { useMemo } from 'react'
import { Button, theme as antdTheme } from 'antd'
import * as AntIcons from '@ant-design/icons'
import { InteractiveLabel } from 'ui-labelling-shared'
import { useRandomizedBackground } from '../../hooks/useRandomizedBackground'

// Ant Icons exports a bunch of things; we only want React components.
// Most icon components are functions with a displayName ending in "Outlined"/"Filled"/"TwoTone".
const iconEntries = Object.entries(AntIcons)
  .filter(([k, v]) => k !== 'default' && 'render' in v)

type Props = {
  columns?: number
  maxIcons?: number
}

function shuffleCopy<T>(arr: T[], rng = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type ButtonKnob = {
  shape: 'default' | 'round'
  padX: number
  padY: number
  minWidth: number
  minHeight: number
  variant: 'default' | 'primary' | 'dashed'
}

function makeRandomButtonKnob(rng = Math.random): ButtonKnob {
  const shape: ButtonKnob['shape'] = rng() < 0.33 ? 'round' : 'default'
  const padX = 6 + Math.floor(rng() * 14) // 6..19
  const padY = 4 + Math.floor(rng() * 10) // 4..13
  const minWidth = 28 + Math.floor(rng() * 18) // 28..45
  const minHeight = 28 + Math.floor(rng() * 18) // 28..45
  const variantPool: ButtonKnob['variant'][] = ['default', 'primary', 'dashed']
  const variant = variantPool[Math.floor(rng() * variantPool.length)]
  return { shape, padX, padY, minWidth, minHeight, variant }
}

// Simple “contrast text” for arbitrary CSS colors (rgb/rgba/hex) — good enough for synthetic UI.
function cssToRgb(css: string): { r: number; g: number; b: number } | null {
  const s = css.trim().toLowerCase()

  const m = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/,
  )
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }

  if (s.startsWith('#')) {
    const hex = s.slice(1)
    const h =
      hex.length === 3 || hex.length === 4
        ? hex
            .slice(0, 3)
            .split('')
            .map((c) => c + c)
            .join('')
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

  return null
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const toLin = (c: number) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const R = toLin(r)
  const G = toLin(g)
  const B = toLin(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function getContrastText(bgCss: string): string {
  const rgb = cssToRgb(bgCss)
  if (!rgb) return 'rgba(0,0,0,0.85)'
  // threshold ~0.5 works fine for synthetic pages
  return luminance(rgb) < 0.5 ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)'
}

/**
 * AntD version of the “random sample icons grid”.
 * - Random background each mount
 * - Random sample of maxIcons
 * - ONE global button style per mount (shape + padding), applied to all icons
 * - data-label is on the AntD Button (lands on the underlying <button>)
 */
export function AntIconsGrid({
  columns = 10,
  maxIcons = 50,
}: Props) {

  const { token } = antdTheme.useToken()

  const names = useMemo(() => {
    const all = iconEntries.map(([k]) => k)
    return shuffleCopy(all).slice(0, Math.max(0, maxIcons))
  }, [maxIcons])

  const bg = useRandomizedBackground()
  const fg = useMemo(() => {
    if (!bg) return undefined
    return getContrastText(bg)
  }, [bg])

  // ✅ ONE style per mount, used for all buttons
  const buttonKnob = useMemo(() => makeRandomButtonKnob(), [])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 12,
        alignItems: 'start',
        backgroundColor: bg ?? 'transparent',
        color: fg ?? 'initial',
        padding: 12,
      }}
    >
      {names.map((name) => {
        const IconComp = (AntIcons as any)[name] as React.ComponentType<any> | undefined
        if (!IconComp) return null

        return (
          <div
            key={name}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 8,
            }}
          >
            <Button
              // IMPORTANT: put the data-label on the actual button for bbox selection
              data-label={`label_${InteractiveLabel.iconbutton}`}
              type={buttonKnob.variant === 'primary' ? 'primary' : 'default'}
              shape={buttonKnob.shape}
              // Make it “icon button”-ish (no text)
              icon={<IconComp />}
              // Keep it feeling Ant-ish, but let our knob control geometry
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `${buttonKnob.padY}px ${buttonKnob.padX}px`,
                minWidth: buttonKnob.minWidth,
                minHeight: buttonKnob.minHeight,
                lineHeight: 0,
                // dashed option
                borderStyle: buttonKnob.variant === 'dashed' ? 'dashed' : 'solid',
                // inherit page fg so it stays readable against bg
                color: 'inherit',
                borderColor: token.colorBorder,
                background: 'transparent',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
