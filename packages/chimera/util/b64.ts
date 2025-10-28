export const getDataUrl = (source: ArrayBuffer) => {
  return `data:image/png;base64,${Buffer.from(source).toString('base64')}`
}
