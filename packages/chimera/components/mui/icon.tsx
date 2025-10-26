import { OverridableComponent } from '@mui/material/OverridableComponent'
import { SvgIconTypeMap } from '@mui/material/SvgIcon'
import { randInt, randomPick } from '../../util/random'
import { useEffect, useState } from 'react'
import { SxProps, Theme } from '@mui/material'

type MuiIconComponent = OverridableComponent<SvgIconTypeMap<{}, 'svg'>> & {
  muiName: string
}

export const RandomMuiIcon = ({
  icons,
  sizeRange,
  sx,
}: {
  icons: MuiIconComponent[]
  sizeRange?: [number, number]
  sx?: SxProps<Theme>
}) => {
  const [minSize, maxSize] = sizeRange ?? [30, 70]

  const [size, setSize] = useState<number>(sizeRange?.[0] ?? 30)
  const [icon, setIcon] = useState<MuiIconComponent>(icons[0])

  useEffect(() => {
    const _size = randInt(minSize, maxSize)
    const _icon = randomPick(icons)
    setSize(_size)
    setIcon(_icon)
  }, [setSize, setIcon, minSize, maxSize])

  if (!icon) {
    return null
  }

  const Icon = icon

  return (
    <Icon sx={{
      fontSize: `${size}px`,
      ...sx,
    }} />
  )
}