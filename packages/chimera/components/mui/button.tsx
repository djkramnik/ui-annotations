// components/random/MuiButtonSet.tsx
import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  Stack,
  Paper,
  Button,
  useTheme,
} from '@mui/material'

import SaveIcon from '@mui/icons-material/Save'
import SendIcon from '@mui/icons-material/Send'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import EditIcon from '@mui/icons-material/Edit'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import InfoIcon from '@mui/icons-material/Info'
import SettingsIcon from '@mui/icons-material/Settings'

import { randInt, randomPick } from '../../util/random'
import { getRandomButtonLabel } from '../../util/faker/button'

type ButtonColor =
  | 'primary'
  | 'secondary'
  | 'inherit'
  | 'success'
  | 'error'
  | 'info'
  | 'warning'

type Item = {
  label: string
  variant: 'contained' | 'outlined' | 'text'
  size: 'small' | 'medium' | 'large'
  color: ButtonColor
  fullWidth: boolean
  disabled: boolean
  disableElevation: boolean
  startIcon: React.ReactNode | undefined
  endIcon: React.ReactNode | undefined
  width: number
  shadowIndex: number
}

const ICON_POOL = [
  SaveIcon,
  SendIcon,
  DeleteIcon,
  ArrowForwardIcon,
  ArrowBackIcon,
  ShoppingCartIcon,
  EditIcon,
  PlayArrowIcon,
  PauseIcon,
  InfoIcon,
  SettingsIcon,
]

export function MuiButtonSet() {
  const theme = useTheme()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = 10

    const generated: Item[] = Array.from({ length: count }, () => {
      const variant = randomPick<Item['variant']>(['contained', 'outlined', 'text'])
      const color = randomPick<ButtonColor>([
        'primary',
        'secondary',
        'success',
        'error',
        'info',
        'warning',
      ])

      const label = getRandomButtonLabel()

      // Icon logic: sometimes add either a startIcon OR an endIcon, never both
      let startIcon: React.ReactNode | undefined
      let endIcon: React.ReactNode | undefined

      const roll = Math.random()
      if (roll < 0.45) {
        const IconComp = randomPick(ICON_POOL)
        const iconNode = <IconComp fontSize="small" />
        if (Math.random() < 0.5) {
          startIcon = iconNode
        } else {
          endIcon = iconNode
        }
      }

      return {
        label,
        variant,
        size: randomPick(['small', 'medium', 'large']),
        color,
        fullWidth: Math.random() < 0.2,
        disabled: Math.random() < 0.1,
        disableElevation: Math.random() < 0.4,
        startIcon,
        endIcon,
        width: randInt(160, 260),
        shadowIndex: randInt(0, 3),
      }
    })

    setItems(generated)
  }, [])

  return (
    <Stack spacing={2} alignItems="flex-start">
      {items.map((it, idx) => (
        <Paper
          key={idx}
          elevation={it.shadowIndex}
          sx={{
            width: it.fullWidth ? '100%' : it.width,
            p: 1.5,
            borderRadius: 2,
            boxShadow: (theme.shadows as unknown as string[])[it.shadowIndex],
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button
            data-label="label_button"
            fullWidth={it.fullWidth}
            variant={it.variant}
            size={it.size}
            color={it.color}
            disabled={it.disabled}
            disableElevation={it.disableElevation}
            startIcon={it.startIcon}
            endIcon={it.endIcon}
          >
            {it.label}
          </Button>
        </Paper>
      ))}
    </Stack>
  )
}
