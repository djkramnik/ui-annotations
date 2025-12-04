import { SxProps, Theme, useTheme } from '@mui/material/styles'
import { Rect, ServiceManualLabel } from 'ui-labelling-shared'
import {
  estimateFontAndTrackingBox,
  getHeaderLevel,
} from '../../util/generator'
import { Avatar, ListItem, Typography } from '@mui/material'
import { MultiLine } from '../generator/multi-line'
import { DynamicPlaceholderImg } from '../generator/dynamic-img'
import { ComponentRendererType } from '../../util/generator/types'
import { TocEntry } from '../generator/toc_entry'

export const DynamicMuiComponent: ComponentRendererType = ({
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
  container: Rect
  sx?: SxProps<Theme>
  scale: number
  textContent?: string | null
}) => {
  const theme = useTheme()
  const inferredFontInfo = textContent
    ? estimateFontAndTrackingBox(rect, textContent, {
        lineCount: textContent.split('\n').length,
      })
    : null
  const fontStyling = inferredFontInfo
    ? {
        fontSize: `${inferredFontInfo.fontPx * scale + getFsInflation(label)}px`,
        letterSpacing: `${inferredFontInfo.letterSpacingPx * scale}px`,
      }
    : null

  switch (label) {
    case ServiceManualLabel.page_frame:
      return (
        <div id="label_page_frame" className="synthetic-container-page_frame" />
      )
    case ServiceManualLabel.box:
      return (
        <div id="label_box" className="synthetic-container-box" />
      )
    case ServiceManualLabel.toc:
      return (
        <div id="label_toc" className="synthetic-container-toc" />
      )
    case ServiceManualLabel.toc_section:
      return (
        <div id="label_toc_section" className="synthetic-container-toc_section" />
      )

    case ServiceManualLabel.page_context:
      return (
        <div id="label_toc_section" className="synthetic-container-page_context" />
      )

    case ServiceManualLabel.table:
      return (
        <div id="label_table" className="synthetic-container-table" />
      )

    case ServiceManualLabel.toc_entry:
      if (!textContent) {
        return null
      }
      const mainTextStyle = inferredFontInfo
        ? {
            fontSize: `${inferredFontInfo.fontPx * scale + getFsInflation(ServiceManualLabel.text_block)}px`,
            letterSpacing: `${inferredFontInfo.letterSpacingPx * scale}px`,
          }
        : null
      const pageNumStyle = inferredFontInfo
        ? {
            fontSize: `${inferredFontInfo.fontPx * scale + getFsInflation(ServiceManualLabel.page_num)}px`,
            letterSpacing: `${inferredFontInfo.letterSpacingPx * scale}px`,
          }
        : null

      return (
        <TocEntry
          textContent={textContent}
          textSx={mainTextStyle}
          pageNumSx={pageNumStyle}
          containerSx={sx}
        />
      )



    case ServiceManualLabel.qr_code:
    case ServiceManualLabel.barcode:
      break

    case ServiceManualLabel.diagram_number:
      return (
        <Avatar
          id="label_diagram_number"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...sx,
          }}
        >
          {children}
        </Avatar>
      )
    case ServiceManualLabel.diagram:
    case ServiceManualLabel.image:
    case ServiceManualLabel.logo:
    case ServiceManualLabel.icon:
    case ServiceManualLabel.icon_warn:
      return <DynamicPlaceholderImg label={label} width={100} rect={rect} />
    case ServiceManualLabel.section_number:
    case ServiceManualLabel.heading:
      if (!textContent) {
        return null
      }
      const headingLevel =
        textContent && inferredFontInfo
          ? getHeaderLevel({
              rect,
              text_content: textContent,
              pageWidth: page.width,
              fontPx: inferredFontInfo.fontPx,
            })
          : 'h3'

      return (
        <Typography
          id={`label_${label}`}
          variant={headingLevel}
          sx={{
            width: 'fit-content',
            height: 'fit-content',
            ...(fontStyling ?? {}),
            ...sx,
          }}
        >
          <MultiLine>{children}</MultiLine>
        </Typography>
      )
    case ServiceManualLabel.caption:
    case ServiceManualLabel.image_id:
    case ServiceManualLabel.text_block:
    case ServiceManualLabel.page_num:
      if (!textContent) {
        return null
      }
      return (
        <Typography
          id={`label_${label}`}
          component="p"
          sx={{
            ...(fontStyling ?? {}),
            ...sx,
          }}
        >
          <MultiLine>{children}</MultiLine>
        </Typography>
      )
    case ServiceManualLabel.bulletpoint:
      const numbered =
        typeof textContent === 'string'
          ? /^(?:\s*\d+\.|\(\d+\))/.test(textContent)
          : false

      return (
        <ListItem
          disableGutters
          id={`label_${label}`}
          sx={{
            padding: 0,
            ...(fontStyling ?? {}),
            ...sx,
          }}
        >
          {
            !numbered && (
              <span className="my-bullet" />
            )
          }
          <span className="my-text">
            <MultiLine>{children}</MultiLine>
          </span>
        </ListItem>
      )
    default:
      return null
  }
}

function getFsInflation(label: ServiceManualLabel) {
  switch (label) {
    case ServiceManualLabel.heading:
      return 5
    case ServiceManualLabel.section_number:
      return 10
    case ServiceManualLabel.image_id:
      return 2
    default:
      return 0
  }
}


