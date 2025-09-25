export const toImgSrc = (buf: ArrayBuffer): string => {
  return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`
}