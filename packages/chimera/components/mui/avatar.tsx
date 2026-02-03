import * as React from 'react'
import { useEffect, useState } from 'react'
import { Avatar, Paper, Stack, Typography, useTheme } from '@mui/material'
import { randInt, randomPick } from '../../util/random'

const COLORS = [
  '#2196f3', '#673ab7', '#009688',
  '#ff5722', '#795548', '#3f51b5',
]

type Item = {
  size: number           // 32–96
  variant: 'circular' | 'rounded' | 'square'
  shadowIndex: number    // 1–6
  bgColor: string
  content: string        // initials or emoji
}

export function MuiAvatar() {
  const theme = useTheme()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = 8

    const makeContent = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

      if (Math.random() < 0.8) {
        return letters[randInt(0,25)]
      }
      return (
        letters[randInt(0,25)] +
        letters[randInt(0,25)]
      )
    }

    const generated: Item[] = Array.from({ length: count }, () => ({
      size: randInt(32, 96),
      variant: randomPick(['circular','rounded','square']),
      shadowIndex: randInt(1, 6),
      bgColor: randomPick(COLORS),
      content: makeContent(),
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
            p: 2,
            borderRadius: 2,
            boxShadow: (theme.shadows as unknown as string[])[it.shadowIndex],
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            transition: 'box-shadow 0.25s ease',
          }}
        >
          <Avatar
            data-label="label_avatar"
            variant={it.variant}
            sx={{
              width: it.size,
              height: it.size,
              bgcolor: it.bgColor,
              fontSize: it.size * 0.4,
            }}
          >
            {it.content}
          </Avatar>

          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            size: {it.size}px
            <br />
            variant: {it.variant}
          </Typography>
        </Paper>
      ))}
    </Stack>
  )
}
