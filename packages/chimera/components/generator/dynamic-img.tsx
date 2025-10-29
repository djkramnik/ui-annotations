import { useEffect, useState } from 'react'
import { Rect } from '../../util/generator'
import { fetchCrops } from '../../util/api'
import { getDataUrl } from '../../util/b64'

export const DynamicPlaceholderImg = ({
  rect,
  width,
  label,
}: {
  width: number // width of the image in its container as pct
  rect: Rect // the bounding box of the image
  label?: string
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const aspectRatio = Number((rect.width / rect.height).toFixed(2))
    fetchCrops({
      label,
      minRatio: aspectRatio - 0.5,
      maxRatio: aspectRatio + 0.5,
      total: 1,
    }).then(crops => {
      if (cancelled) {
        return
      }
      if (!crops.length) {
        console.warn('no appropriate image found')
        return
      }

      setDataUrl(getDataUrl(crops[0].screenshot))
    })
    return () => { cancelled = true }
  }, [setDataUrl, rect])

  return (
    <div
      style={{
        width: `${width}%`,
        aspectRatio: `${Math.floor(rect.width)} / ${Math.floor(rect.height)}`,
        border: `1px solid currentColor`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        ...(
          dataUrl
            ? {
              backgroundImage: `url(${dataUrl})`
            }
            : undefined
        )
      }}
    />
  )
}
