import { Rect } from '../../util/generator'

export const DynamicPlaceholderImg = ({
  rect,
  width,
}: {
  width: number // width of the image in its container as pct
  rect: Rect // the bounding box of the image
}) => {
  return (
    <div
      style={{
        width: `${width}%`,
        aspectRatio: `${Math.floor(rect.width)} / ${Math.floor(rect.height)}`,
        border: `1px solid currentColor`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'contain',
      }}
    />
  )
}
