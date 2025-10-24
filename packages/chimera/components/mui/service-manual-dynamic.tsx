import { SxProps, Theme } from '@mui/material/styles';
import { ServiceManualLabel } from "ui-labelling-shared"
import { getHeaderLevel, Rect } from "../../util/generator"
import { ListItem, Typography } from "@mui/material"

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
      const headerLevel: ReturnType<typeof getHeaderLevel> = typeof children === 'string'
        ? getHeaderLevel(rect, children, page.width)
        : 'h3'

      return (
        <Typography variant={headerLevel} sx={sx}>
          {children}
        </Typography>
      )
    case ServiceManualLabel.text_block:
      if (!children) {
        return null
      }
      return (
        <Typography component="p" sx={sx}>{children}</Typography>
      )
    case ServiceManualLabel.bulletpoint:
      return (
        <ListItem sx={{ display: 'list-item', ...sx }}>
          {children}
        </ListItem>
      )
    default:
      return null
  }
}