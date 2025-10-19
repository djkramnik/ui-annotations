import {
  Cloud,
  CloudCircle,
  CloudCircleOutlined,
  CloudCircleRounded,
  CloudCircleSharp,
  Download,
  DownloadForOffline,
  FileDownload,
  FileDownloadOutlined,
  Folder,
  Image,
  Upload,
  UploadFile,
  UploadFileOutlined,
  UploadFileRounded,
  UploadFileSharp,
  UploadFileTwoTone,
} from '@mui/icons-material'
import { VanillaTheme } from './type'
import { randInt } from '../../util/random'
import { RandomMuiIcon } from '../mui/icon'
import { VanillaButton } from './button'

export const FilePicker = ({ theme }: { theme: VanillaTheme }) => {

  const header = headers[randInt(0, headers.length - 1)]
  const clause = clauses[randInt(0, clauses.length - 1)]
  const tertiary = ternarys[randInt(0, ternarys.length - 1)]
  const buttonText = buttonTexts[randInt(0, buttonTexts.length - 1)]

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
        padding: `${padding}px`,
        border: `${borderWidth}px ${borderStyle} currentColor`,
      }}
    >
      <RandomMuiIcon
        icons={[
          Download,
          DownloadForOffline,
          FileDownload,
          FileDownloadOutlined,
          Cloud,
          CloudCircle,
          CloudCircleOutlined,
          CloudCircleRounded,
          CloudCircleSharp,
          Image,
          Folder,
          Upload,
          UploadFile,
          UploadFileOutlined,
          UploadFileRounded,
          UploadFileSharp,
          UploadFileTwoTone,
        ]}
      />
      {extraHeaderMargin ? (
        <div style={{ height: `${buttonMargin}px` }} />
      ) : null}
      <p
        style={{
          fontSize: `${fontSize}px`,
          textAlign: 'center',
          margin: withTertiary && tertiaryAbsolute
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

type FilePickerText = {
  header: string
  clause: string
  tertiary: string
  button: string
}

const FILE_PICKER_TEXTS: FilePickerText[] = [
  {
    header: 'Drag & drop files here',
    clause: 'or click to browse',
    tertiary: 'Supports JPG, PNG, PDF up to 10 MB',
    button: 'Browse',
  },
  {
    header: 'Upload your document',
    clause: 'Drag it here or choose a file',
    tertiary: 'Max file size: 5 MB · Formats: PDF, DOCX',
    button: 'Select File',
  },
  {
    header: 'Drop images to upload',
    clause: 'or tap below to pick',
    tertiary: 'PNG, JPG, WEBP up to 8 MB',
    button: 'Upload Image',
  },
  {
    header: 'Select your files',
    clause: 'Drag files anywhere on this area',
    tertiary: 'Up to 5 files, each 20 MB max',
    button: 'Choose Files',
  },
  {
    header: 'Upload project assets',
    clause: 'Drag and drop, or click the button',
    tertiary: 'Supports ZIP, RAR, TAR.GZ (max 50 MB)',
    button: 'Upload',
  },
  {
    header: 'Attach your resume',
    clause: 'Drop it here or click below',
    tertiary: 'Accepted formats: PDF, DOCX, RTF (10 MB limit)',
    button: 'Attach',
  },
  {
    header: 'Import a CSV dataset',
    clause: 'Click or drag a CSV file here',
    tertiary: 'Comma-separated values only, up to 15 MB',
    button: 'Import CSV',
  },
  {
    header: 'Add your profile photo',
    clause: 'Drag an image or browse your device',
    tertiary: 'Square images preferred · Max 2 MB',
    button: 'Choose Photo',
  },
  {
    header: 'Upload receipts',
    clause: 'Drop receipts here or use file picker',
    tertiary: 'Supports PDF, JPG, PNG up to 5 MB each',
    button: 'Upload Receipts',
  },
  {
    header: 'Upload design mockups',
    clause: 'Drag files or tap to select',
    tertiary: 'Figma exports · PNG, JPG, ZIP allowed',
    button: 'Select Files',
  },
  {
    header: 'Drop media files here',
    clause: 'or browse local storage',
    tertiary: 'Video: MP4, MOV · Audio: MP3 · Max 100 MB',
    button: 'Upload Media',
  },
  {
    header: 'Drag your invoice',
    clause: 'Click to browse invoices',
    tertiary: 'PDF format required · 20 MB max',
    button: 'Upload Invoice',
  },
  {
    header: 'Upload backup archive',
    clause: 'Drag your ZIP here or select manually',
    tertiary: 'ZIP or TAR.GZ only · Up to 250 MB',
    button: 'Select Archive',
  },
  {
    header: 'Drop your logo image',
    clause: 'or choose a file from your device',
    tertiary: 'Recommended size: 512×512px · PNG/JPG',
    button: 'Upload Logo',
  },
  {
    header: 'Upload signed agreement',
    clause: 'Drag the PDF here or use the button',
    tertiary: 'One file only · Must be under 5 MB',
    button: 'Upload PDF',
  },
  {
    header: 'Upload spreadsheet',
    clause: 'Drop Excel or CSV file here',
    tertiary: 'XLSX, CSV formats supported · 10 MB limit',
    button: 'Select Spreadsheet',
  },
  {
    header: 'Submit assignment',
    clause: 'Drag your file here or browse',
    tertiary: 'Allowed: PDF, DOCX · 15 MB max',
    button: 'Submit',
  },
  {
    header: 'Upload screenshots',
    clause: 'Click or drag images into this area',
    tertiary: 'PNG, JPG only · Up to 10 images · 5 MB each',
    button: 'Upload Images',
  },
  {
    header: 'Upload source code',
    clause: 'Drop files or click below',
    tertiary: 'ZIP or TAR.GZ only · 100 MB limit',
    button: 'Upload Code',
  },
  {
    header: 'Drag files to begin upload',
    clause: 'or choose files manually',
    tertiary: 'Supports common document types',
    button: 'Start Upload',
  },
  {
    header: 'Upload configuration file',
    clause: 'Drag your JSON or YAML here',
    tertiary: 'Max 2 MB · Must be valid format',
    button: 'Upload Config',
  },
  {
    header: 'Add attachments',
    clause: 'Click or drop files below',
    tertiary: 'Any type up to 25 MB total',
    button: 'Add Files',
  },
  {
    header: 'Upload a new version',
    clause: 'Drag the file here or click to select',
    tertiary: 'Versioned uploads replace previous files',
    button: 'Upload',
  },
  {
    header: 'Submit supporting documents',
    clause: 'Drag and drop or browse local storage',
    tertiary: 'PDF, DOC, JPG accepted · 30 MB total',
    button: 'Submit Files',
  },
  {
    header: 'Drop profile background image',
    clause: 'or tap to select a file',
    tertiary: 'JPEG or PNG · 2 MB limit · Landscape preferred',
    button: 'Select Image',
  },
  {
    header: 'Upload medical report',
    clause: 'Drag report here or choose file',
    tertiary: 'PDF or DICOM format · Max 20 MB',
    button: 'Upload Report',
  },
  {
    header: 'Upload 3D model',
    clause: 'Drop GLB, OBJ or FBX file',
    tertiary: 'Max 50 MB · Preview available after upload',
    button: 'Upload Model',
  },
  {
    header: 'Drop dataset here',
    clause: 'or click to upload',
    tertiary: 'CSV, JSON, or ZIP archives up to 200 MB',
    button: 'Upload Dataset',
  },
  {
    header: 'Upload compressed folder',
    clause: 'Drag or click to select ZIP file',
    tertiary: 'Single ZIP file · Up to 100 MB',
    button: 'Choose ZIP',
  },
  {
    header: 'Upload photos for gallery',
    clause: 'Drag & drop multiple files',
    tertiary: 'JPG, PNG up to 5 MB each · 20 files max',
    button: 'Add Photos',
  },
]

const headers = FILE_PICKER_TEXTS.map(f => f.header)
const clauses = FILE_PICKER_TEXTS.map(f => f.clause)
const ternarys = FILE_PICKER_TEXTS.map(f => f.tertiary)
const buttonTexts = FILE_PICKER_TEXTS.map(f => f.button)