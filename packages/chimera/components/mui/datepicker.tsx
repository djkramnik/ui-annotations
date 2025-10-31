import * as React from "react"
import Box from "@mui/material/Box"
import { Dayjs } from "dayjs"
import dayjs from "dayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker"
import { MobileDatePicker } from "@mui/x-date-pickers/MobileDatePicker"
import { StaticDatePicker } from "@mui/x-date-pickers/StaticDatePicker"
import { randInt, randomPick } from "../../util/random"
import { DATE_PICKER_LABELS } from "../../util/faker/date"
import { Theme } from "@mui/material"

type MuiDatePickerProps = {
  label: string
  open?: boolean
}

/**
 * Random plausible default date:
 *  - Choose a base year in [currentYear-3, currentYear+1]
 *  - Pick a random month/day (clamped by month length)
 */
function randomPlausibleDate(): Dayjs {
  const now = dayjs()
  const year = now.year() + randInt(-3, 1)
  const month = randInt(0, 11) // 0-11
  const daysInMonth = dayjs().year(year).month(month).daysInMonth()
  const day = randInt(1, daysInMonth)
  // Random hour/minute for extra realism (kept within business-ish hours)
  const hour = randInt(8, 18)
  const minute = [0, 15, 30, 45][randInt(0, 3)]
  return dayjs().year(year).month(month).date(day).hour(hour).minute(minute).second(0).millisecond(0)
}

/**
 * Randomly choose one picker variant:
 * 0 -> DesktopDatePicker
 * 1 -> MobileDatePicker
 * 2 -> StaticDatePicker
 */
function pickVariant(): 0 | 1 | 2 {
  return randInt(0, 2) as 0 | 1 | 2
}

const MuiDatePicker = () => {
  const [value, setValue] = React.useState<Dayjs | null>(() => randomPlausibleDate())
  const [variant] = React.useState<0 | 1 | 2>(() => pickVariant())
  const open = Math.random() > 0.5
  const label = randomPick(DATE_PICKER_LABELS)
  const sx = {
    // Outlined input root
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'background.paper',
      color: 'text.primary',
      // input text
      '& input': { color: 'text.primary' },
      // calendar icon
      '& .MuiSvgIcon-root': { color: 'text.secondary' },
      // outline (default state)
      '& fieldset': { borderColor: 'divider' },
      // hover/focus states
      '&:hover fieldset': { borderColor: 'primary.main' },
      '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 2 },
      // disabled state
      '&.Mui-disabled': {
        backgroundColor: 'action.disabledBackground',
        '& input': { WebkitTextFillColor: (theme: Theme) => theme.palette.text.disabled },
      },
    },
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: 320 }}>
        {variant === 0 && (
          <DesktopDatePicker
            label={label}
            value={value}
            onChange={(newValue) => setValue(newValue)}
            // If `open` is provided, control the picker to show its calendar immediately
            open={open ?? undefined}
            // Keep the input editable and visible even when open
            slotProps={{
              textField: { fullWidth: true, sx } as any,
            }}
          />
        )}

        {variant === 1 && (
          <MobileDatePicker
            label={label}
            value={value}
            onChange={(newValue) => setValue(newValue)}
            open={open ?? undefined}
            slotProps={{
              textField: { fullWidth: true, sx } as any,
            }}
          />
        )}

        {variant === 2 && (
          <StaticDatePicker
            displayStaticWrapperAs="desktop"
            value={value}
            onChange={(newValue) => setValue(newValue)}
            // StaticDatePicker is always visible (ignores `open`)
            slotProps={{ actionBar: { actions: ["today"] } }}
          />
        )}
      </Box>
    </LocalizationProvider>
  )
}

export default MuiDatePicker