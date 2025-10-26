import { randomPick } from "../random"

export type FilePickerText = {
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

export const fpHeaders = FILE_PICKER_TEXTS.map(f => f.header)
export const fpClauses = FILE_PICKER_TEXTS.map(f => f.clause)
export const fpTernarys = FILE_PICKER_TEXTS.map(f => f.tertiary)
export const fpButtonTexts = FILE_PICKER_TEXTS.map(f => f.button)

const dirs = ['tmp', 'var', 'usr', 'etc', 'home', 'opt', 'data', 'logs']
const exts = ['txt', 'json', 'png', 'jpg', 'pdf', 'log', 'csv', 'mp4']

function randId(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len)
}

export function randomFilePath({
  depth = 2,
  withExt = true,
  root = '/',
}: { depth?: number; withExt?: boolean; root?: string } = {}): string {
  const parts = Array.from({ length: depth }, () => randomPick(dirs))
  const filename = randId()
  const ext = withExt ? `.${randomPick(exts)}` : ''
  return `${root}${parts.join('/')}/${filename}${ext}`
}