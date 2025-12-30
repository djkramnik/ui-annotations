import * as React from 'react'
import { useEffect, useState } from 'react'
import { Pagination, PaginationItem, Paper, Stack, useTheme } from '@mui/material'
import { randInt, randomPick } from '../../util/random'

type Item = {
  width: number                // 260–520
  count: number                // 3–15 pages
  defaultPage: number          // 1–count
  size: 'small' | 'medium' | 'large'
  color: 'primary' | 'secondary' | 'standard'
  variant: 'text' | 'outlined'
  shape: 'circular' | 'rounded'
  shadowIndex: number          // 1–6
}

export function MuiPagination() {
  const theme = useTheme()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const itemCount = randInt(2, 6)

    const generated: Item[] = Array.from({ length: itemCount }, () => {
      const pageCount = randInt(3, 15)
      return {
        width: randInt(260, 520),
        count: pageCount,
        defaultPage: randInt(1, pageCount),
        size: randomPick(['small', 'medium', 'large']),
        color: randomPick(['primary', 'secondary', 'standard']),
        variant: randomPick(['text', 'outlined']),
        shape: randomPick(['circular', 'rounded']),
        shadowIndex: randInt(1, 6),
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
            width: it.width,
            p: 1.5,
            borderRadius: 2,
            boxShadow: (theme.shadows as unknown as string[])[it.shadowIndex],
            transition: 'box-shadow 0.25s ease',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Pagination
            count={it.count}
            defaultPage={it.defaultPage}
            size={it.size}
            color={it.color}
            variant={it.variant}
            shape={it.shape}
            renderItem={(item) => (
              <PaginationItem
                {...item}          // ← preserves ALL default behavior
                data-label="label_pagination"
              />
            )}
          />
        </Paper>
      ))}
    </Stack>
  )
}
