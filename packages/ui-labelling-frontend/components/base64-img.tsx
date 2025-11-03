import { CSSProperties, useMemo } from "react"
import { getDataUrl } from "../utils/b64"

export const Base64Img = ({
  source,
  style,
}: {
  source: ArrayBuffer
  style?: CSSProperties
}) => {
  const screenshotDataUrl: string =
    useMemo(() => getDataUrl(source), [source])
  return (
    <img style={style} src={screenshotDataUrl} />
  )
}
