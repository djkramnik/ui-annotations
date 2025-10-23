import { CSSProperties, useMemo } from "react"

export const Base64Img = ({
  source,
  style,
}: {
  source: ArrayBuffer
  style?: CSSProperties
}) => {
  const screenshotDataUrl: string =
    useMemo(() => `data:image/png;base64,${Buffer.from(source).toString('base64')}`, [source])
  return (
    <img style={style} src={screenshotDataUrl} />
  )
}