import * as Icons from '@mui/icons-material'
import { randomPick } from '../../util/random'
import { useMemo } from 'react'
import { SxProps } from '@mui/material'

const muiIconNames = Object.entries(Icons).filter(
  ([, v]) => v && typeof v === 'object' && 'type' in (v as any),
).map(([k, v]) => k)

export const RandomMuiIcon = ({
  permittedIcons,
  sx,
  iconSize = 24,
}: {
  permittedIcons?: string[]
  sx?: SxProps
  iconSize?: number
}) => {
  const randomIconName: string = useMemo(() => {
    const candidateIcons = permittedIcons
      ? muiIconNames.filter(n => permittedIcons.includes(n))
      : muiIconNames

    if (permittedIcons && candidateIcons.length !== permittedIcons.length) {
      console.warn('bad icon name in permitted icons?', permittedIcons, candidateIcons)
    }
    if (candidateIcons.length === 0) {
      console.error(muiIconNames.length, permittedIcons?.length, permittedIcons)
      throw Error('random mui icon could not get icon')
    }
    return randomPick(candidateIcons)
  }, [permittedIcons])

  const Icon = (Icons as any)[randomIconName] as React.ComponentType<any> | undefined
  if (!Icon) return null
  return <Icon sx={{...sx, fontSize: iconSize }} />
}


import * as AntIcons from '@ant-design/icons'
const antIconNames = Object.entries(AntIcons)
  .filter(([k, v]) => k !== 'default' && 'render' in v)
  .map(([k, v]) => k)

export const RandomAntIcon = ({
  permittedIcons,
  iconSize = 24,
}: {
  permittedIcons?: string[]
  iconSize?: number
}) => {
  const randomIconName: string = useMemo(() => {
    const candidateIcons = permittedIcons
      ? antIconNames.filter(n => permittedIcons.includes(n))
      : antIconNames

    if (permittedIcons && candidateIcons.length !== permittedIcons.length) {
      console.warn('bad icon name in permitted icons?', permittedIcons, candidateIcons)
    }
    if (candidateIcons.length === 0) {
      console.error(antIconNames.length, permittedIcons?.length, permittedIcons)
      throw Error('random ant icon could not get icon')
    }
    return randomPick(candidateIcons)
  }, [permittedIcons])

  const Icon = (AntIcons as any)[randomIconName] as React.ComponentType<any> | undefined
  if (!Icon) return null

  // Ant Design icons accept `style` for sizing (fontSize works)
  return <Icon style={{ fontSize: iconSize }} />
}