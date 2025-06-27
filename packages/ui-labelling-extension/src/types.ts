export enum ExtensionMessage {
  startMain = 'startMain',
  turnOffExtension = 'turnOffExtension',
  clean = 'clean',
  exportSuccess = 'exportSuccess',
  exportFailed = 'exportFailed',
  clearAnnotations = 'clearAnnotations'
}


export type SimilarUiOptions = {
  matchTag?: boolean
  matchClass: boolean
  exact?: boolean // per
  tolerance?: number
  max?: number
  keys: string[]
}
