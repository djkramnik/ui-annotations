import { useMemo } from 'react'
import * as Icons from '@mui/icons-material'
import { InteractiveLabel } from 'ui-labelling-shared'
import { useRandomizedBackground } from '../../hooks/useRandomizedBackground'
import { useTheme } from '@mui/material/styles'

const iconNames = Object.entries(Icons).filter(
  ([k, v]) =>
    // filters out internal exports like __esModule
    'type' in v
)

type Props = {
  /** How many columns in the grid */
  columns?: number
  /** MUI icon fontSize prop */
  fontSize?: 'inherit' | 'small' | 'medium' | 'large'
}

/**
 * Renders a grid of every @mui/icons-material icon.
 *
 * Each icon is wrapped in a tight inline-flex container with:
 *   data-label={`${dataLabelPrefix}${iconName}`}
 * so selectors like:
 *   [data-label="mui_icon_AccessAlarm"]
 * get a bounding box that closely matches the icon.
 */
export function AllMuiIconsGrid({
  columns = 10,
  fontSize = 'medium',
}: Props) {
  const theme = useTheme()

  const names = useMemo(() => {
    return iconNames.map(([k, v]) => k)
  }, [])

  const bg = useRandomizedBackground()
  const fg = useMemo(() => {
    if (!bg) {
      return undefined
    }
    return theme.palette.getContrastText(bg)
  }, [bg])
  return (
    <div

      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 12,
        alignItems: 'start',
        backgroundColor: bg ?? 'transparent',
        color: fg ?? 'initial'
      }}
    >
      {names.map((name) => {
        const Icon = (Icons as any)[name] as
          | React.ComponentType<any>
          | undefined
        if (!Icon) return null

        // Put the data-label on a tight wrapper that hugs the svg.
        // Use inline-flex + line-height:0 to avoid extra line box height.
        return (
          <div
            key={name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: 8,
              borderRadius: 8,
            }}
          >
            <span
              data-label={`label_${InteractiveLabel.iconbutton}`}
              style={{
                display: 'inline-flex',
                width: 'fit-content',
                height: 'fit-content',
                lineHeight: 0,
                // eliminate weird baseline layout effects
                verticalAlign: 'top',
              }}
            >
              <Icon fontSize={fontSize} />
            </span>
          </div>
        )
      })}
    </div>
  )
}
