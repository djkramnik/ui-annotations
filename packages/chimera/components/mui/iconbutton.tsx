import * as React from 'react'
import { useMemo } from 'react'
import * as Icons from '@mui/icons-material'
import { InteractiveLabel } from 'ui-labelling-shared'
import { useRandomizedBackground } from '../../hooks/useRandomizedBackground'
import { useTheme } from '@mui/material/styles'

const iconEntries = Object.entries(Icons).filter(
  ([, v]) => v && typeof v === 'object' && 'type' in (v as any),
)

type Props = {
  columns?: number
  fontSize?: 'inherit' | 'small' | 'medium' | 'large'
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
}

function makeRandomButtonKnob(rng = Math.random): ButtonKnob {
  // pick one of a few sane styles
  const kind = Math.floor(rng() * 3) // 0 pill, 1 rounded, 2 sharper

  const padX = 6 + Math.floor(rng() * 14) // 6..19
  const padY = 4 + Math.floor(rng() * 10) // 4..13

  const borderRadiusPx =
    kind === 0
      ? 9999
      : kind === 1
        ? 10 + Math.floor(rng() * 10) // 10..19
        : 2 + Math.floor(rng() * 6) // 2..7

  // keep a minimum hit area feel; still allows tight bboxes around inner span if you select that
  const minWidth = 28 + Math.floor(rng() * 18) // 28..45
  const minHeight = 28 + Math.floor(rng() * 18) // 28..45

  return { borderRadiusPx, padX, padY, minWidth, minHeight }
}

/**
 * Random sample of MUI icons. One global button style per mount.
 */
export function AllMuiIconsGrid({
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
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `${buttonKnob.padY}px ${buttonKnob.padX}px`,
                borderRadius: buttonKnob.borderRadiusPx,
                minWidth: buttonKnob.minWidth,
                minHeight: buttonKnob.minHeight,

                // keep it “buttony” but theme-safe
                background: 'transparent',
                color: 'inherit',
                border: '1px solid currentColor',
                cursor: 'pointer',
              }}
            >
              {/* Put the data-label on the tight wrapper for bbox accuracy */}
              <span
                data-label={`label_${InteractiveLabel.iconbutton}`}
                style={{
                  display: 'inline-flex',
                  width: 'fit-content',
                  height: 'fit-content',
                  lineHeight: 0,
                  verticalAlign: 'top',
                }}
              >
                <Icon fontSize={fontSize} />
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
