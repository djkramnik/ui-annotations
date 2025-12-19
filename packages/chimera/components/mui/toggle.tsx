import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  Stack,
  Paper,
  Switch,
  FormControlLabel,
  Typography,
  useTheme,
  styled,
} from '@mui/material'
import { randInt, randomPick } from '../../util/random'

type Size = 'small' | 'medium'
type Color = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'

type Item = {
  width: number
  margin: number
  size: Size
  scale: number // 0.9–1.3 visual scale factor
  color: Color
  labelPx: number
  shadowIndex: number
  label: string
  checked: boolean
  disabled: boolean
  labelPlacement: 'start' | 'end'
  wrapped?: boolean
}

const TOGGLE_LABELS = [
  'Notifications',
  'Dark mode',
  'Auto-updates',
  'Location access',
  'Background sync',
  'Email alerts',
  'Beta features',
  'Sound effects',
  'Compact mode',
  'Energy saver',
  'Auto-play',
  'Smart suggestions',
  'Two-factor auth',
  'Calendar sync',
  'Live captions',
]

const WrappedSwitch = styled(Switch)(({ theme }) => ({
  width: 46,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 3,
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.primary.main,
        opacity: 1,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    width: 20,
    height: 20,
    boxShadow: 'none',
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.grey[400],
    opacity: 1,
  },
}))

export function MuiToggle() {
  const theme = useTheme()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(2, 6)
    const generated: Item[] = Array.from({ length: count }, () => ({
      width: randInt(220, 600),
      margin: randInt(6, 18),
      size: randomPick<Size>(['small', 'medium']),
      scale: randInt(90, 130) / 100, // random visual scaling 0.9–1.3
      color: randomPick<Color>([
        'primary',
        'secondary',
        'success',
        'info',
        'warning',
        'error',
      ]),
      labelPx: randInt(13, 20),
      shadowIndex: randInt(1, 6),
      label: randomPick(TOGGLE_LABELS),
      checked: Math.random() < 0.6,
      disabled: Math.random() < 0.15,
      labelPlacement: randomPick(['start', 'end'] as const),
      wrapped: Math.random() > 0.7,
    }))
    setItems(generated)
  }, [])

  return (
    <Stack spacing={2} alignItems="flex-start">
      {items.map((it, idx) => (
        <Paper
          key={`${it.label}-${idx}`}
          elevation={it.shadowIndex}
          sx={{
            width: it.width,
            p: 1.25,
            borderRadius: 2,
            boxShadow: (theme.shadows as unknown as string[])[it.shadowIndex],
            transition: 'box-shadow 0.25s ease',
            transform: `scale(${it.scale})`,
            transformOrigin: 'left top',
          }}
        >
          <FormControlLabel
            label={
              <Typography sx={{
                fontSize: it.labelPx,
                lineHeight: 1.4,
                ...(it.labelPlacement === 'end'
                  ? {
                    marginLeft: `${it.margin}px`
                  }
                  : {
                    marginRight: `${it.margin}px`
                  }
                )
                }}>
                {it.label}
              </Typography>
            }
            labelPlacement={it.labelPlacement}
            control={
              it.wrapped ? (
                <Switch
                  size={it.size}
                  color={it.color}
                  checked={it.checked}
                  onChange={() =>
                    setItems((prev) =>
                      prev.map((x, j) =>
                        j === idx ? { ...x, checked: !x.checked } : x,
                      ),
                    )
                  }
                  disabled={it.disabled}
                />
              ) : (
                <WrappedSwitch
                  size={it.size}
                  color={it.color}
                  checked={it.checked}
                  onChange={() =>
                    setItems((prev) =>
                      prev.map((x, j) =>
                        j === idx ? { ...x, checked: !x.checked } : x,
                      ),
                    )
                  }
                  disabled={it.disabled}
                />
              )
            }
          />
        </Paper>
      ))}
    </Stack>
  )
}
