import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box, Slider, Stack } from '@mui/material'
import { randInt, randomPick } from '../../util/random'

type Size = 'small' | 'medium'
type Orientation = 'horizontal' | 'vertical'
type Track = 'normal' | 'inverted' | false
type Value = number | [number, number]

type Item = {
  width: number            // 220–600
  scale: number            // 0.9–1.3
  size: Size               // small | medium
  disabled: boolean
  orientation: Orientation
  track: Track
  colorHex: string         // per-slider color (not theme-based)
  min: number
  max: number
  step?: number
  marks: boolean | { value: number; label?: string }[]
  valueLabelDisplay: 'off' | 'auto' | 'on'
  range: boolean
  value: Value
}

const PALETTE = [
  '#1976d2', '#0288d1', '#2e7d32', '#ed6c02', '#d32f2f', '#7b1fa2',
  '#3949ab', '#c2185b', '#7cb342', '#fb8c00',
]

function makeMarks(min: number, max: number) {
  if (Math.random() < 0.5) return true
  const mid = Math.round((min + max) / 2)
  return [
    { value: min, label: `${min}` },
    { value: mid, label: `${mid}` },
    { value: max, label: `${max}` },
  ]
}

export function MuiSlider() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = 1
    const generated: Item[] = Array.from({ length: count }, () => {
      const min = 0
      const max = randomPick([50, 100, 200])
      const step = randomPick([1, 2, 5, 10, undefined])
      const orientation: Orientation = Math.random() < 0.25 ? 'vertical' : 'horizontal'
      const range = Math.random() < 0.4
      const v1 = randInt(min, max)
      const v2 = randInt(min, max)
      const withMarks = Math.random() > 0.7
      const [a, b] = v1 < v2 ? [v1, v2] : [v2, v1]

      return {
        width: randInt(220, 600),
        scale: randInt(90, 130) / 100,
        size: randomPick<Size>(['small', 'medium']),
        disabled: Math.random() < 0.15,
        orientation,
        track: randomPick<Track>(['normal', 'inverted', false]),
        colorHex: randomPick(PALETTE),
        min,
        max,
        step,
        marks: withMarks ? makeMarks(min, max) : false,
        valueLabelDisplay: randomPick(['off', 'auto', 'on']),
        range,
        value: range ? ([a, b] as [number, number]) : randInt(min, max),
      }
    })
    setItems(generated)
  }, [])

  return (
    <div style={{ padding: '50px'}}>
      <Stack direction="column" alignItems="flex-start" spacing={2}>
        {items.map((it, idx) => {
          const wrapperSx =
            it.orientation === 'vertical'
              ? { height: randInt(140, 260), px: 2, py: 3 }
              : { py: 1.5 }

          return (
            <Box
              key={idx}
              sx={{
                width: it.width,
                transform: `scale(${it.scale})`,
                transformOrigin: 'left top',
              }}
              // expose per-item color to Slider parts
              style={{ ['--c' as any]: it.colorHex }}
            >
              <Box sx={wrapperSx}>
                <Slider
                  data-label="label_slider"
                  value={it.value}
                  onChange={(_, newValue) =>
                    setItems(prev =>
                      prev.map((x, j) => (j === idx ? { ...x, value: newValue as Value } : x)),
                    )
                  }
                  min={it.min}
                  max={it.max}
                  step={it.step}
                  marks={it.marks}
                  size={it.size}
                  disabled={it.disabled}
                  orientation={it.orientation}
                  track={it.track}
                  valueLabelDisplay={it.valueLabelDisplay}
                  // style parts using the per-item CSS var
                  sx={{
                    '& .MuiSlider-thumb': {
                      bgcolor: 'var(--c)',
                      border: '2px solid #fff',
                      boxShadow: 'none',
                    },
                    '& .MuiSlider-track': {
                      bgcolor: 'var(--c)',
                    },
                    '& .MuiSlider-rail': {
                      opacity: 0.3,
                    },
                    '& .MuiSlider-valueLabel': {
                      bgcolor: 'var(--c)',
                    },
                  }}
                  aria-label={`Random slider ${idx + 1}`}
                />
              </Box>
            </Box>
          )
        })}
      </Stack>
    </div>
  )
}
