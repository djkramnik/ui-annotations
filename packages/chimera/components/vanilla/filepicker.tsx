import { VanillaTheme } from './type'
import { randInt, randomPick } from '../../util/random'

import { VanillaButton } from './button'

import {
  AntCloudOutlined,
  DownloadOutlined,
  FileAddFilled,
  FileAddOutlined,
  FileExcelFilled,
  FileExcelOutlined,
  FileExcelTwoTone,
  FileImageFilled,
  FileImageOutlined,
  FileJpgOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FileZipFilled,
  FileZipOutlined,
  ProfileOutlined,
  ProfileTwoTone,
  UploadOutlined,
} from '@ant-design/icons'
import { Flex } from '../generator/flex'
import {
  fpButtonTexts,
  fpClauses,
  fpHeaders,
  fpTernarys,
  randomFilePath,
} from '../../util/faker/filepicker'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RandomAntIcon, RandomMuiIcon } from './icon'

// need a variant where its just a button and the icon
// need a variant where its just an input with a couple of file related decorations
// (like a text input with a choose file button inside)

export const FilePicker = ({ theme }: { theme: VanillaTheme }) => {
  const header = randomPick(fpHeaders)
  const clause = randomPick(fpClauses)
  const tertiary = randomPick(fpTernarys)
  const buttonText = randomPick(fpButtonTexts)

  const centered = randInt(0, 3) > 0
  const flexEnd = randInt(0, 1) === 1
  const width = randInt(200, 500)
  const aspectRatio = [1, 1.2, 1.4, 1.6, 1.7][randInt(0, 7)]
  const aspectRatioCorrected =
    centered && width < 400 ? aspectRatio : Math.min(1.4, aspectRatio)
  const padding = randInt(8, 20)
  const gap = randInt(4, 10)
  const borderWidth = randInt(0, 2)
  const borderStyle = ['solid', 'dotted'][randInt(0, 1)]
  const fontSize = randInt(12, 40)
  const includeClause = randInt(0, 2) === 0
  const clauseButton = randInt(0, 2) > 0
  const extraButtonMargin = randInt(0, 1) === 1
  const extraHeaderMargin = randInt(0, 1) === 1
  const headerMarginForTertiarySpacing = randInt(12, 20)
  const buttonMargin = randInt(4, 20)
  const capitalizeHeader = randInt(0, 1) === 1
  const withTertiary = Math.random() > 0.6
  const tertiaryAbsolute = Math.random() > 0.6
  const tertiaryPosition = [
    { bottom: '0', right: '0' },
    { bottom: '0', left: '0' },
    { top: '0', right: '0' },
    { top: '0', left: '0' },
  ][randInt(0, 3)]
  const tertiaryPadding = randInt(0, 4)
  const withMuiIcon = Math.random() > 0.5

  const iconSize = useMemo(() => randInt(24, 40), [])

  return (
    <div
      className="dropzone"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: centered
          ? 'center'
          : flexEnd
            ? 'flex-end'
            : 'flex-start',
        gap: `${gap}px`,
        color: theme.palette.typography.primary,
        backgroundColor: theme.palette.backgroundColor,
        fontFamily: theme.font.fontFamily.primary,
        width: `${width}px`,
        height: `${Math.floor(width * aspectRatioCorrected)}px`,
        maxHeight: '560px',
        padding: `${padding}px`,
        border: `${borderWidth}px ${borderStyle} currentColor`,
      }}
    >

      {withMuiIcon ? (
        <RandomMuiIcon
          iconSize={iconSize}
          permittedIcons={[
            'AttachEmail',
            'AttachFile',
            'AttachEmailRounded',
            'AttachEmailTwoTone',
            'AttachFileOutlined',
            'AttachFileRounded',
            'AttachFileTwoTone',
            'AttachFileSharp',
            'Download',
            'DownloadForOffline',
            'FileDownload',
            'FileDownloadOutlined',
            'Cloud',
            'CloudCircle',
            'CloudCircleOutlined',
            'CloudCircleRounded',
            'CloudCircleSharp',
            'Image',
            'Folder',
            'Upload',
            'UploadFile',
            'UploadFileOutlined',
            'UploadFileRounded',
            'UploadFileSharp',
            'UploadFileTwoTone',
          ]}
        />
      ) : (
        <RandomAntIcon
          iconSize={iconSize}
          permittedIcons={[
            'AntCloudOutlined',
            'DownloadOutlined',
            'FileAddFilled',
            'FileAddOutlined',
            'FileExcelFilled',
            'FileExcelOutlined',
            'FileExcelTwoTone',
            'FileImageFilled',
            'FileImageOutlined',
            'FileJpgOutlined',
            'FileProtectOutlined',
            'FileSearchOutlined',
            'FileZipFilled',
            'FileZipOutlined',
            'ProfileOutlined',
            'ProfileTwoTone',
            'UploadOutlined',
          ]}
        />
      )}
      {extraHeaderMargin ? (
        <div style={{ height: `${buttonMargin}px` }} />
      ) : null}
      <p
        style={{
          fontSize: `${fontSize}px`,
          textAlign: 'center',
          margin:
            withTertiary && tertiaryAbsolute
              ? `${headerMarginForTertiarySpacing}px`
              : 0,
          textTransform: capitalizeHeader ? 'capitalize' : 'initial',
        }}
      >
        {header}
        {includeClause && !clauseButton ? (
          <>
            &nbsp;or&nbsp;
            <span style={{ textDecoration: 'underline' }}>{clause}</span>
          </>
        ) : null}
      </p>
      {withTertiary ? (
        <p
          style={{
            textAlign: 'center',
            fontSize: `${Math.min(18, Math.floor(fontSize * 0.8))}px`,
            margin: 0,
            padding: tertiaryAbsolute ? `${tertiaryPadding}px` : 'initial',
            position: tertiaryAbsolute ? `absolute` : `static`,
            ...(tertiaryAbsolute ? tertiaryPosition : {}),
          }}
        >
          {tertiary}
        </p>
      ) : null}
      {includeClause && clauseButton ? (
        <>
          {extraButtonMargin ? (
            <div style={{ height: `${buttonMargin}px` }} />
          ) : null}
          <VanillaButton theme={theme}>{buttonText}</VanillaButton>
        </>
      ) : null}
    </div>
  )
}

export const FilePickerSlim = ({ theme }: { theme: VanillaTheme }) => {
  const inputRef = useRef<HTMLDivElement | null>(null)

  const [hPad, setHpad] = useState<number>(8)
  const [vPad, setVPad] = useState<number>(7)
  const [placeholder, setPlaceholder] = useState<string>('Select file')
  const [fontSize, setFontSize] = useState<number>(14)
  const [minWidth, setMinWidth] = useState<number>(240)
  const [iconSize, setIconSize] = useState<number>(24)
  const [focus, setFocus] = useState<boolean>(false)
  const [selected, setSelected] = useState<boolean>(false)
  const [bookEndPos, setBookEndPos] = useState<'start' | 'end'>('end')

  const [bookEndW, setBookEndWidth] = useState<number | null>(null)

  // randomize everything
  useEffect(() => {
    const _hPad = randInt(8, 20)
    const _vPad = Math.round(_hPad / 1.2)
    const _selected = Math.random() > 0.5
    const _placeholder = !_selected ? randomPick(fpHeaders) : randomFilePath()

    setHpad(_hPad)
    setVPad(_vPad)
    setSelected(_selected)
    setPlaceholder(_placeholder)
    setFontSize(randInt(12, 18))
    setMinWidth(randInt(200, 500))
    setFocus(Math.random() > 0.7)
    setIconSize(randInt(24, 30))
    setBookEndPos(Math.random() > 0.7 ? 'start' : 'end')
  }, [
    setHpad,
    setVPad,
    setPlaceholder,
    setSelected,
    setFontSize,
    setMinWidth,
    setFocus,
    setIconSize,
    setBookEndPos,
  ])

  useEffect(() => {
    if (!inputRef.current) {
      return
    }
    setTimeout(() => {
      setBookEndWidth(inputRef.current!.clientHeight)
    }, 0)
  }, [
    hPad,
    vPad,
    placeholder,
    fontSize,
    minWidth,
    focus,
    selected,
    iconSize,
    setBookEndWidth,
  ])

  const border = focus
    ? `1px solid ${theme.palette.typography.primary}`
    : `3px solid ${theme.palette.typography.primary}`

  return (
    <Flex
      gap="4px"
      aic
      ref={inputRef}
      style={{
        border,
        position: 'relative',
        backgroundColor: theme.palette.backgroundColor,
        color: theme.palette.typography.primary,
      }}
    >
      {bookEndW && bookEndPos === 'start' ? (
        <Flex
          jcc
          aic
          style={{
            width: `${bookEndW}px`,
            height: `${bookEndW}px`,
            borderRight: `1px solid ${theme.palette.typography.primary}`,
          }}
        >
          <RandomMuiIcon
            iconSize={iconSize}
            permittedIcons={[
              'AttachFile',
              'AudioFile',
              'AudioFileOutlined',
              'AudioFileRounded',
              'AudioFileSharp',
              'AudioFileTwoTone',
              'DriveFileMove',
              'DriveFileMoveOutline',
              'AttachEmail',
              'AttachEmailRounded',
              'AttachEmailTwoTone',
              'AttachFileOutlined',
              'AttachFileRounded',
              'AttachFileSharp',
              'AttachFileTwoTone',
            ]}
          />
        </Flex>
      ) : null}
      <input
        type="text"
        placeholder={placeholder}
        value={selected ? placeholder : ''}
        style={{
          color: theme.palette.typography.primary,
          minWidth: `${minWidth}px`,
          border: 'none',
          padding: `${vPad}px ${hPad}px`,
          paddingLeft: `${vPad}px`,
          fontSize: `${fontSize}px`,
          background: 'transparent',
          fontFamily: theme.font.fontFamily.primary,
        }}
        color={theme.palette.primary}
      />
      {selected ? (
        <RandomMuiIcon
          iconSize={iconSize}
          sx={{
            ...(bookEndPos === 'start'
              ? {
                  marginRight: '4px',
                }
              : {}),
          }}
          permittedIcons={[
            'RemoveCircle',
            'RemoveCircleOutline',
            'Close',
            'Delete',
            'DeleteOutline',
          ]}
        />
      ) : null}
      {bookEndW && bookEndPos === 'end' ? (
        <Flex
          jcc
          aic
          style={{
            width: `${bookEndW}px`,
            height: `${bookEndW}px`,
            borderLeft: `1px solid ${theme.palette.typography.primary}`,
          }}
        >
          <RandomMuiIcon
            iconSize={iconSize}
            permittedIcons={[
              'AttachFile',
              'AudioFile',
              'DriveFileMove',
              'DriveFileMoveOutline',
              'AttachEmail',
              'AttachEmailRounded',
              'AttachEmailTwoTone',
              'AttachFileOutlined',
              'AttachFileRounded',
              'AttachFileSharp',
            ]}
          />
        </Flex>
      ) : null}
    </Flex>
  )
}
