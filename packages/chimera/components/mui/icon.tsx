import { SvgIconProps } from '@mui/material/SvgIcon'
import { OverridableComponent } from '@mui/material/OverridableComponent'
import { SvgIconTypeMap } from '@mui/material/SvgIcon'
import { randInt } from '../../util/random'

type MuiIconComponent = OverridableComponent<SvgIconTypeMap<{}, 'svg'>> & {
  muiName: string
}

export const RandomMuiIcon = ({
  icons,
  sizeRange
}: {
  icons: MuiIconComponent[]
  sizeRange?: [number, number]
}) => {
  const [minSize, maxSize] = sizeRange ?? [30, 70]
  const size = randInt(minSize, maxSize)
  const Icon = icons[randInt(0, icons.length - 1)]

  return (
    <Icon sx={{ fontSize: `${size}px`}} />
  )
}