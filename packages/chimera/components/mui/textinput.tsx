// components/random/MuiTextInput.tsx
import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  Stack,
  Paper,
  TextField,
  useTheme,
  InputAdornment,
} from '@mui/material'

import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import PersonIcon from '@mui/icons-material/Person'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import PublicIcon from '@mui/icons-material/Public'
import NumbersIcon from '@mui/icons-material/Numbers'

import { randInt, randomPick } from '../../util/random'
import { getRandomSentences } from '../../util/faker/text'
import { getRandomFieldError } from '../../util/faker/error'
import {
  getRandomTextInputConfig,
  TextInputFlavor,
} from '../../util/faker/textinput'

type Item = {
  width: number
  shadowIndex: number
  size: 'small' | 'medium'
  variant: 'outlined' | 'filled' | 'standard'
  margin: 'none' | 'dense' | 'normal'
  type: 'text' | 'email' | 'password' | 'number'
  label: string
  placeholder?: string
  defaultValue?: string
  error: boolean
  helperText?: string
  required: boolean
  disabled: boolean
  startIcon: React.ReactNode | null
  endIcon: React.ReactNode | null
}

// Pool of icons (feel free to expand)
const ICON_POOL = [
  EmailIcon,
  LockIcon,
  PersonIcon,
  SearchIcon,
  BusinessIcon,
  PublicIcon,
  NumbersIcon,
]

// Map flavors to more logical default icons (optional boost)
function pickIconForFlavor(flavor: TextInputFlavor) {
  switch (flavor) {
    case 'email':
      return EmailIcon
    case 'password':
      return LockIcon
    case 'name':
      return PersonIcon
    case 'username':
      return PersonIcon
    case 'company':
      return BusinessIcon
    case 'city':
      return PublicIcon
    case 'search':
      return SearchIcon
    case 'amount':
    case 'quantity':
      return NumbersIcon
    default:
      return randomPick(ICON_POOL)
  }
}

// Map from flavor → HTML type + error flavor
function getTypeForFlavor(
  flavor: TextInputFlavor,
): {
  type: Item['type']
  errorKind: 'generic' | 'email' | 'password' | 'number'
} {
  switch (flavor) {
    case 'email':
      return { type: 'email', errorKind: 'email' }
    case 'password':
      return { type: 'password', errorKind: 'password' }
    case 'amount':
    case 'quantity':
    case 'postalCode':
      return { type: 'number', errorKind: 'number' }
    default:
      return { type: 'text', errorKind: 'generic' }
  }
}

export function MuiTextInput() {
  const theme = useTheme()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const count = randInt(3, 7)

    const generated: Item[] = Array.from({ length: count }, () => {
      const { flavor, label, placeholder } = getRandomTextInputConfig()
      const { type, errorKind } = getTypeForFlavor(flavor)

      const { error, helperText } = getRandomFieldError(errorKind)

      // Default value logic
      const hasDefaultValue = Math.random() < 0.5
      let defaultValue = ''
      if (hasDefaultValue) {
        if (type === 'password') defaultValue = ''
        else if (type === 'email') defaultValue = 'user@example.com'
        else if (type === 'number') defaultValue = String(randInt(1, 9999))
        else defaultValue = getRandomSentences(1)
      }

      // Icon logic — about 40% chance start, 35% chance end
      const maybeIcon = Math.random() < 0.4
      const maybeEnd = Math.random() < 0.35

      const iconComponent = pickIconForFlavor(flavor)

      const startIcon = maybeIcon
        ? React.createElement(iconComponent, {
            fontSize: 'small',
            sx: { opacity: 0.7 },
          })
        : null

      const endIcon = !startIcon && maybeEnd
        ? React.createElement(randomPick(ICON_POOL), {
            fontSize: 'small',
            sx: { opacity: 0.7 },
          })
        : null

      return {
        width: randInt(220, 420),
        shadowIndex: randInt(1, 6),
        size: randomPick(['small', 'medium']),
        variant: randomPick(['outlined', 'filled', 'standard']),
        margin: randomPick(['none', 'dense', 'normal']),
        type,
        label,
        placeholder,
        defaultValue,
        error,
        helperText,
        required: Math.random() < 0.5,
        disabled: Math.random() < 0.1,
        startIcon,
        endIcon,
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
          }}
        >
          <TextField
            data-label="label_textinput"
            fullWidth
            type={it.type}
            size={it.size}
            variant={it.variant}
            margin={it.margin}
            label={it.label}
            placeholder={it.placeholder}
            defaultValue={it.defaultValue}
            error={it.error}
            helperText={it.helperText}
            required={it.required}
            disabled={it.disabled}
            InputProps={{
              startAdornment: it.startIcon ? (
                <InputAdornment position="start">{it.startIcon}</InputAdornment>
              ) : undefined,
              endAdornment: it.endIcon ? (
                <InputAdornment position="end">{it.endIcon}</InputAdornment>
              ) : undefined,
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: it.size === 'small' ? 13 : 15,
              },
            }}
          />
        </Paper>
      ))}
    </Stack>
  )
}
