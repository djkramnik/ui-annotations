import { SxProps, Theme } from '@mui/material/styles';
import { ServiceManualLabel } from "ui-labelling-shared"
import { estimateFontSize, getHeaderLevel, Rect } from "../../util/generator"
import { ListItem, Typography } from "@mui/material"
import { MultiLine } from '../generator/multi-lilne';

export const DynamicMuiComponent = ({
  label,
  children,
  rect,
  page,
  sx,
  container
} : {
  label: ServiceManualLabel
  children?: React.ReactNode
  rect: Rect
  page: { width: number; height: number }
  container: Rect
  sx?: SxProps<Theme>
}) => {
  const isText = typeof children === 'string'
  const firstLine = isText
    ? children.split('\n')[0]
    : null
  switch(label) {
    case ServiceManualLabel.diagram:
    case ServiceManualLabel.image:
      const pctW = Math.round(
        Math.min(rect.width, container.width) / container.width
      ) * 100
      return (
        <div style={{
          width: `${pctW}%`,
          aspectRatio: `${Math.floor(rect.width)} / ${Math.floor(rect.height)}`,
          border: `1px solid currentColor`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
        }} />
      )
    case ServiceManualLabel.heading:
      if (!children) {
        return null
      }
      const headerLevel: ReturnType<typeof getHeaderLevel> = firstLine
        ? getHeaderLevel(rect, firstLine, page.width)
        : 'h3'
      return (
        <Typography variant={headerLevel}
          sx={{
            ...sx,
            ...(firstLine
              ? {
                fontSize: `${estimateFontSize(rect, firstLine)}px`
              }
              : null
            )
          }}>
          <MultiLine>{children}</MultiLine>
        </Typography>
      )
    case ServiceManualLabel.text_block:
      if (!children) {
        return null
      }
      return (
        <Typography component="p" sx={{
          ...sx,
          ...(firstLine
            ? {
              fontSize: `${estimateFontSize(rect, firstLine)}px`
            }
            : null
          )
        }}><MultiLine>{children}</MultiLine></Typography>
      )
    case ServiceManualLabel.bulletpoint:
      console.log('bulletpoint', children, firstLine)
      return (
        <ListItem sx={{
          display: 'list-item',
          ...sx,
          ...(firstLine
            ? {
              fontSize: `${estimateFontSize(rect, firstLine)}px`
            }
            : null
          )
          }}>
          <MultiLine>{children}</MultiLine>
        </ListItem>
      )
    default:
      return null
  }
}