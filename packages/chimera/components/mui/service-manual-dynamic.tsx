import { SxProps, Theme } from '@mui/material/styles'
import { Rect, ServiceManualLabel } from 'ui-labelling-shared'
import {
  estimateFontAndTrackingBox,
  getHeaderLevel,
} from '../../util/generator'
import { Avatar, ListItem, Typography } from '@mui/material'
import { MultiLine } from '../generator/multi-line'
import { DynamicPlaceholderImg } from '../generator/dynamic-img'

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
    case ServiceManualLabel.diagram_number:
      return <Avatar sx={sx}>{children}</Avatar>
    case ServiceManualLabel.diagram:
    case ServiceManualLabel.image:
      const frac = Math.min(rect.width, container.width) / container.width
      return (
        <DynamicPlaceholderImg
          label={label}
          width={Math.round(frac * 100)}
          rect={rect}
        />
      )
    case ServiceManualLabel.heading:
      if (!children) {
        return null
      }
      const headingLevel = isText && inferredFontInfo
        ? getHeaderLevel({
            rect,
            text_content: children,
            pageWidth: page.width,
            fontPx: inferredFontInfo.fontPx
        })
        : 'h3'

      return (
        <Typography
          variant={headingLevel}
          sx={{
            ...fontStyling ?? {},
            ...sx,
          }}
        >
          <MultiLine>{children}</MultiLine>
        </Typography>
      )
    case ServiceManualLabel.text_block:
    case ServiceManualLabel.page_num:
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