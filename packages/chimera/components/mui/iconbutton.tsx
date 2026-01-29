import * as React from 'react'
import { useMemo } from 'react'
import * as Icons from '@mui/icons-material'
import { ButtonBase } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { InteractiveLabel } from 'ui-labelling-shared'
import { useRandomizedBackground } from '../../hooks/useRandomizedBackground'

const iconEntries = Object.entries(Icons).filter(
  ([, v]) => v && typeof v === 'object' && 'type' in (v as any),
)

type Props = {
  /** How many columns in the grid */
  columns?: number
  /** MUI icon fontSize prop */
  fontSize?: 'inherit' | 'small' | 'medium' | 'large'
  /** Maximum number of icons to show (random sample) */
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
  borderRadiusPx: number
  padX: number
  padY: number
  minWidth: number
  minHeight: number
  outlined: boolean
}

function makeRandomButtonKnob(rng = Math.random): ButtonKnob {
  // 0 pill, 1 rounded rect, 2 sharper rect
  const kind = Math.floor(rng() * 3)

  const padX = 6 + Math.floor(rng() * 14) // 6..19
  const padY = 4 + Math.floor(rng() * 10) // 4..13

  const borderRadiusPx =
    kind === 0
      ? 9999
      : kind === 1
        ? 10 + Math.floor(rng() * 10) // 10..19
        : 2 + Math.floor(rng() * 6) // 2..7

  const minWidth = 28 + Math.floor(rng() * 18) // 28..45
  const minHeight = 28 + Math.floor(rng() * 18) // 28..45

  const outlined = rng() > 0.35 // mostly outlined, sometimes subtle filled

  return { borderRadiusPx, padX, padY, minWidth, minHeight, outlined }
}

/**
 * Random sample of MUI icons in a grid.
 * - One global button style per mount (shape + padding)
 * - Each icon wrapped in a MUI-like ButtonBase
 * - data-label is on the button element for bbox selection
 */
export function MuiIconsGridAlt({
  columns = 10,
  fontSize = 'medium',
  maxIcons = 50,
}: Props) {
  const theme = useTheme()

  const names = useMemo(() => {
    const allNames = iconEntries.map(([k]) => k)
    return shuffleCopy(allNames).slice(0, Math.max(0, maxIcons))
  }, [maxIcons])

  const bg = useRandomizedBackground()
  const fg = useMemo(() => {
    if (!bg) return undefined
    return theme.palette.getContrastText(bg)
  }, [bg, theme])

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
        const Icon = (Icons as any)[name] as React.ComponentType<any> | undefined
        if (!Icon) return null

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
            <ButtonBase
              data-label={`label_${InteractiveLabel.iconbutton}`}
              focusRipple
              // keep layout tightly hugging the button box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: `${buttonKnob.borderRadiusPx}px`,
                px: `${buttonKnob.padX}px`,
                py: `${buttonKnob.padY}px`,
                minWidth: `${buttonKnob.minWidth}px`,
                minHeight: `${buttonKnob.minHeight}px`,
                lineHeight: 0, // avoid extra inline height
                // MUI-ish visuals
                border: buttonKnob.outlined
                  ? '1px solid'
                  : '1px solid transparent',
                borderColor: buttonKnob.outlined ? 'currentColor' : 'transparent',
                backgroundColor: buttonKnob.outlined
                  ? 'transparent'
                  : 'rgba(255,255,255,0.08)',
                color: 'inherit',
                transition: theme.transitions.create(
                  ['background-color', 'box-shadow', 'transform'],
                  { duration: theme.transitions.duration.shortest },
                ),
                '&:hover': {
                  backgroundColor: buttonKnob.outlined
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(255,255,255,0.12)',
                },
                '&:active': {
                  transform: 'translateY(0.5px)',
                },
                // ensure ripple is clipped correctly for pill/rounded
                overflow: 'hidden',
              }}
            >
              <Icon fontSize={fontSize} />
            </ButtonBase>
          </div>
        )
      })}
    </div>
  )
}
