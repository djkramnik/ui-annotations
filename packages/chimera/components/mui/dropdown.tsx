import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  useTheme,
} from '@mui/material'
import { randInt, randomPick } from '../../util/random'
import {
  getRandomOptionLabels,
  getRandomDropdownPhrase,
} from '../../util/faker/select' // adjust path as needed

type Item = {
  width: number                 // 240–520
  shadowIndex: number           // 1–6
  labels: string[]
  selectedIndex: number | null  // null = nothing selected
  open: boolean                 // whether dropdown menu is open
  size: 'small' | 'medium'
  variant: 'outlined' | 'filled' | 'standard'
  phrase: string                // label text
}

export function MuiDropdown() {
  const theme = useTheme()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = 1

    const generated: Item[] = Array.from({ length: count }, () => {
      const optionCount = randInt(3, 9)
      const labels = getRandomOptionLabels(optionCount, true)
      const phrase = getRandomDropdownPhrase()

      // 70% chance something is selected
      const hasSelection = Math.random() < 0.7
      const selectedIndex = hasSelection
        ? randInt(0, labels.length - 1)
        : null

      return {
        width: randInt(240, 520),
        shadowIndex: randInt(1, 6),
        labels,
        selectedIndex,
        // 40% chance of starting open
        open: Math.random() < 0.4,
        size: randomPick(['small', 'medium']),
        variant: randomPick(['outlined', 'filled', 'standard']),
        phrase,
      }
    })

    setItems(generated)
  }, [])

  const handleOpenChange = (idx: number, open: boolean) => {
    setItems(prev =>
      prev.map((item, i) =>
        i === idx ? { ...item, open } : item
      )
    )
  }

  return (
    <Stack spacing={2} alignItems="flex-start">
      {items.map((it, idx) => {
        const value =
          it.selectedIndex !== null ? it.labels[it.selectedIndex] : ''

        const labelId = `mui-dropdown-label-${idx}`
        const selectId = `mui-dropdown-select-${idx}`

        return (
          <Paper
            key={idx}
            elevation={it.shadowIndex}
            sx={{
              width: it.width,
              p: 1.5,
              borderRadius: 2,
              boxShadow: (theme.shadows as unknown as string[])[it.shadowIndex],
              transition: 'box-shadow 0.25s ease',
            }}
          >
            <FormControl
              fullWidth
              size={it.size}
              variant={it.variant}
            >
              <InputLabel
                id={labelId}
                // keep label up when there's a value or when open, so it doesn't overlap
                shrink={Boolean(value) || it.open}
              >
                {it.phrase}
              </InputLabel>
              <Select
                labelId={labelId}
                id={selectId}
                label={it.phrase}
                value={value}
                open={it.open}
                onOpen={() => handleOpenChange(idx, true)}
                onClose={() => handleOpenChange(idx, false)}
              >
                {it.labels.map((label) => (
                  <MenuItem key={label} value={label}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        )
      })}
    </Stack>
  )
}
