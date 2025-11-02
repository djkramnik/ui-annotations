export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type PageMode = | 'initial' | 'toggle' | 'draw' | 'danger' | 'occlude'
export type ToggleState = | 'delete' | 'adjust' | 'label'
export type DangerState = | 'publish' | 'delete' | 'update'