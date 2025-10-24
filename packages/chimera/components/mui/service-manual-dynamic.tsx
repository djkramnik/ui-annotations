import { SxProps, Theme } from '@mui/material/styles'
import { ServiceManualLabel } from 'ui-labelling-shared'
import {
  estimateFontAndTrackingBox,
  getHeaderLevel,
  Rect,
} from '../../util/generator'
import { ListItem, Typography } from '@mui/material'
import { MultiLine } from '../generator/multi-line'

export const DynamicMuiComponent = ({
  label,
  children,
  rect,
  page,
  sx,
  container,
  scale,
}: {
  label: ServiceManualLabel
  children?: React.ReactNode
  rect: Rect
  page: { width: number; height: number }
  container: Rect
  sx?: SxProps<Theme>
  scale: number
}) => {
  const isText = typeof children === 'string'
  const inferredFontInfo = isText
    ? estimateFontAndTrackingBox(rect, children, {
        lineCount: children.split('\n').length,
      })
    : null
  const fontStyling = inferredFontInfo
    ? {
        fontSize: `${(inferredFontInfo.fontPx * scale) + getFsInflation(label)}px`,
        letterSpacing: `${inferredFontInfo.letterSpacingPx * scale}px`,
      }
    : null
  switch (label) {
    case ServiceManualLabel.diagram:
    case ServiceManualLabel.image:
      const pctW =
        Math.round(Math.min(rect.width, container.width) / container.width) *
        100
      return (
        <div
          style={{
            width: `${pctW}%`,
            aspectRatio: `${Math.floor(rect.width)} / ${Math.floor(rect.height)}`,
            border: `1px solid currentColor`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
          }}
        />
      )
    case ServiceManualLabel.heading:
      if (!children) {
        return null
      }

      return (
        <Typography
          variant="h3"
          sx={{
            ...fontStyling ?? {},
            ...sx,
          }}
        >
          <MultiLine>{children}</MultiLine>
        </Typography>
      )
    case ServiceManualLabel.text_block:
      if (!children) {
        return null
      }
      return (
        <Typography
          component="p"
          sx={{
            ...fontStyling ?? {},
            ...sx,
          }}
        >
          {children}
        </Typography>
      )
    case ServiceManualLabel.bulletpoint:
      return (
        <ListItem
          sx={{
            display: 'list-item',
            padding: 0,
            ...fontStyling ?? {},
            ...sx,
          }}
        >
          <MultiLine>{children}</MultiLine>
        </ListItem>
      )
    default:
      return null
  }
}

function getFsInflation(label: ServiceManualLabel) {
  switch(label) {
    case ServiceManualLabel.heading:
      return 5
    default:
      return 0
  }
}