import { Rect, Screenshot, ServiceManualLabel } from "ui-labelling-shared"
import { SxProps, Theme } from "@mui/material"

export type PreviewSchema = {
  screenshot: Screenshot
  designPref: 'mui' | 'ant'
  layout: Array<{
    rect: Rect
    components: string[]
  }>
  contentBounds: Rect
}

export type GridItem = {
  id: number
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}

export type ComponentRendererType = ({
    label,
    children,
    rect,
    page,
    sx,
    container,
    scale,
    textContent,
  }: {
    label: ServiceManualLabel
    children?: React.ReactNode
    rect: Rect
    page: { width: number; height: number }
    sx?: SxProps<Theme>
    container: Rect
    scale: number
    textContent?: string | null
  }) => React.ReactNode

export type GridRendererProps = {
  parentId: number
  parentTag?: string
  data: PreviewSchema
  style?: React.CSSProperties
  className?: string
  showDebugBorders?: boolean
  maxWidth?: number
  ComponentRenderer: ComponentRendererType
}

