import * as React from 'react'
import { useEffect, useState } from 'react'
import { Stack, Paper, TextField, useTheme } from '@mui/material'
import { randInt, randomPick } from '../../util/random'
import { getRandomSentences } from '../../util/faker/text'

type Item = {
  width: number           // 240–520
  rows: number            // 2–6
  fontPx: number          // 13–17
  shadowIndex: number     // theme elevation 1–6
  defaultValue?: string
}

export function MuiTextarea() {
  const theme = useTheme()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(2, 5)
    const generated: Item[] = Array.from({ length: count }, () => ({
      width: randInt(240, 520),
      rows: randInt(2, 6),
      fontPx: randInt(13, 17),
      shadowIndex: randInt(1, 6),
      defaultValue: Math.random() < 0.6 ? getRandomSentences(randInt(1, 3)) : '',
    }))
    setItems(generated)
  }, [])

  return (
    <Stack spacing={2} alignItems="flex-start">
      {items.map((it, idx) => (
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
          <TextField
            data-label="label_textarea"
            fullWidth
            multiline
            minRows={it.rows}
            defaultValue={it.defaultValue}
            placeholder="Enter text..."
            variant="outlined"
            sx={{
              '& .MuiInputBase-input': {
                fontSize: it.fontPx,
                lineHeight: 1.5,
              },
            }}
          />
        </Paper>
      ))}
    </Stack>
  )
}
