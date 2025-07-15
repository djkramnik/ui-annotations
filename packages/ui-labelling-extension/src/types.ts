export enum ExtensionMessage {
  startMain = 'startMain',
  turnOffExtension = 'turnOffExtension',
  clean = 'clean',
  exportSuccess = 'exportSuccess',
  exportFailed = 'exportFailed',
  clearAnnotations = 'clearAnnotations'
}

export const SALIENT_VISUAL_PROPS: readonly string[] = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-shadow',
  'text-decoration-line',
  'text-decoration-color',
  'color',
  'opacity',
  'background-color',
  'background-image',
  'background-repeat',
  'background-size',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'outline',
  'outline-offset',
  'box-shadow',
  'cursor',
  'list-style-type',
  'list-style-image'
] as const;

export type SimilarUiOptions = {
  matchTag?: boolean
  matchClass?: boolean
  exact?: boolean // per
  tolerance?: number
  max?: number
  keys: string[]
}

export type ProjectionType =
  | 'siblings' | 'cousins' | 'visual'
