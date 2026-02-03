import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  useTheme,
} from '@mui/material'
import ExpandMore from '@mui/icons-material/ExpandMore'
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown'
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded'

// your existing mock data + utils
import { cardTitles, cardDescriptions } from '../../util/faker/selectablecard'
import { randInt, randomPick } from '../../util/random'

type Item = {
  title: string
  description: string
  width: number            // 280–560
  titlePx: number          // 16–20
  descPx: number           // 12–14
  shadowIndex: number      // theme elevation 1–6
  Icon: React.ElementType  // expand icon
}

const plausibleIcons = [ExpandMore, KeyboardArrowDown, ArrowDropDownRounded]

export function MuiAccordion() {
  const theme = useTheme()
  const [items, setItems] = useState<Item[]>([])
  const [expanded, setExpanded] = useState<number | false>(false)

  useEffect(() => {
    const count = 5
    const generated: Item[] = Array.from({ length: count }, () => ({
      title: randomPick(cardTitles),
      description: randomPick(cardDescriptions),
      width: randInt(280, 560),
      titlePx: randInt(16, 20),
      descPx: randInt(12, 14),
      shadowIndex: randInt(1, 6),
      Icon: randomPick(plausibleIcons),
    }))
    setItems(generated)
    setExpanded(randInt(0, count - 1))
  }, [])

  return (
    <Stack spacing={1} alignItems="flex-start">
      {items.map((it, idx) => {
        const Icon = it.Icon
        return (
          <Accordion
            data-label="label_accordion"
            key={`${it.title}-${idx}`}
            expanded={expanded === idx}
            onChange={(_, isExp) => setExpanded(isExp ? idx : false)}
            sx={{
              width: it.width,
              // Use theme elevations to keep shadows looking native
              boxShadow: (theme.shadows as unknown as string[])[it.shadowIndex],
              borderRadius: 1.5,
              transition: 'box-shadow 0.25s ease',
              '&:before': { display: 'none' }, // remove default divider line (optional)
            }}
          >
            <AccordionSummary
              expandIcon={<Icon />}
              sx={{
                minHeight: 48,
                '& .MuiAccordionSummary-content': { my: 0.5 },
              }}
            >
              <Typography
                sx={{
                  fontSize: it.titlePx,
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {it.title}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0.5 }}>
              <Typography
                color="text.secondary"
                sx={{ fontSize: it.descPx, lineHeight: 1.5, m: 0 }}
              >
                {it.description}
              </Typography>
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Stack>
  )
}
