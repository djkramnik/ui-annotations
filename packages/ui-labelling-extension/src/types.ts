import { AnnotationLabel } from 'ui-labelling-shared'

export enum ExtensionMessage {
  startMain = 'startMain',
  turnOffExtension = 'turnOffExtension',
  clean = 'clean',
  exportSuccess = 'exportSuccess',
  exportFailed = 'exportFailed',
  clearAnnotations = 'clearAnnotations',
  predict = 'predict',
  gatherTextRegions = 'gatherTextRegions',
  gatherInteractiveRegions = 'gatherInteractiveRegions'
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
  'list-style-image',
] as const

export type SimilarUiOptions = {
  matchTag?: boolean
  matchClass?: boolean
  exact?: boolean // per
  tolerance?: number
  max?: number
  keys: string[]
}

export type ProjectionType = 'siblings' | 'cousins' | 'visual'

export type ExtensionState =
  | 'dormant'
  | 'initial'
  | 'navigation'
  | 'confirmation'
  | 'projection'

export enum StorageKeys {
  annotations = 'annotations',
  screenshot = 'screenshot',
  meta = 'meta',
}

export type Annotation = {
    id: string
    ref: HTMLElement
    rect: DOMRect
    label: AnnotationLabel
    useTextNode?: boolean
  }

export type GlobalState = {
  showAnnotations: boolean
  state: ExtensionState
  currEl: null | HTMLElement
  projections: null | HTMLElement[]
  projectTextNode: boolean
  overlayId: string
  shadowId: string
  annotations: Annotation[]
}

export type PredictResponse = {
  boxes: [number, number, number, number][]; // array of [x1, y1, x2, y2]
  scores: number[];
  classes: number[];
  class_names: AnnotationLabel[];
  width: number;
  height: number;
}

export type XyXy = [number, number, number, number]
export type YoloPredictResponse = {
  width: number
  height: number
  detections: {
    box: XyXy,
    conf: number
    label: string
  }[]
}


export const logPrefix = '[UI-LABELLER] '
export const overlayId = 'ui-labelling-overlay'
export const shadowId = 'ui-annotation-shadow-host'

export const log = {
  warn: (...args: any[]) => console.warn(logPrefix, ...args),
  info: (...args: any[]) => console.log(logPrefix, ...args),
  error: (...args: any[]) => console.error(logPrefix, ...args),
}



export function _GlobalState(cb: (key: keyof GlobalState, value: any) => void) {
  let state: ExtensionState = 'dormant'
  let annotations: {
    id: string
    ref: HTMLElement
    rect: DOMRect
    label: AnnotationLabel
  }[] = []
  let projectTextNode: boolean = false
  let projections: HTMLElement[] | null = null
  let currEl: HTMLElement | null = null
  let showAnnotations: boolean = false

  const obj: GlobalState = {
    state,
    annotations,
    overlayId,
    shadowId,
    currEl,
    showAnnotations,
    projections,
    projectTextNode,
  }
  Object.defineProperty(obj, 'projectTextNode', {
    set: (value) => {
      projectTextNode = value
      cb('projectTextNode', value)
    },
    get: () => projectTextNode,
  })
  Object.defineProperty(obj, 'projections', {
    set: (value) => {
      projections = value
      cb('projections', value)
    },
    get: () => projections,
  })
  Object.defineProperty(obj, 'state', {
    set: (value) => {
      state = value
      cb('state', value)
    },
    get: () => state,
  })
  Object.defineProperty(obj, 'annotations', {
    set: (value) => {
      annotations = value
      cb('annotations', value)
    },
    get: () => annotations,
  })
  Object.defineProperty(obj, 'overlayId', {
    get: () => overlayId,
  })
  Object.defineProperty(obj, 'shadowId', {
    get: () => shadowId
  })
  Object.defineProperty(obj, 'currEl', {
    set: (value) => {
      currEl = value
      cb('currEl', value)
    },
    get: () => currEl,
  })
  Object.defineProperty(obj, 'showAnnotations', {
    set: (value) => {
      showAnnotations = value
      cb('showAnnotations', value)
    },
    get: () => showAnnotations,
  })

  return obj
}

export function getOverlay(globals: GlobalState): HTMLElement | null {
  return document.getElementById(globals.shadowId)?.shadowRoot?.getElementById(globals.overlayId) ?? null
}