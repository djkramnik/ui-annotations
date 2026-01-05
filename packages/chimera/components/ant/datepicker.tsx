import * as React from "react"
import { DatePicker, Calendar, Typography, Space } from "antd"
import type { Dayjs } from "dayjs"
import dayjs from "dayjs"
import { randInt, randomPick } from "../../util/random"
import { DATE_PICKER_LABELS } from "../../util/faker/date"
import { LabelWrap } from "../label-wrap"
import { InteractiveLabel } from "ui-labelling-shared"
import { useEffect } from "react"

type Variant = "date" | "month" | "static"

function randomPlausibleDate(): Dayjs {
  const now = dayjs()
  const year = now.year() + randInt(-3, 1)
  const month = randInt(0, 11)
  const daysInMonth = dayjs().year(year).month(month).daysInMonth()
  const day = randInt(1, daysInMonth)
  const hour = randInt(8, 18)
  const minute = [0, 15, 30, 45][randInt(0, 3)]
  return dayjs().year(year).month(month).date(day).hour(hour).minute(minute).second(0).millisecond(0)
}

function pickVariant(): Variant {
  const i = randInt(0, 2)
  return 'date'
  return i === 0 ? "date" : i === 1 ? "month" : "static"
}

const AntDatePicker: React.FC = () => {
  const [value, setValue] = React.useState<Dayjs>(() => randomPlausibleDate())
  const [variant] = React.useState<Variant>(() => pickVariant())
  const label = React.useMemo(() => randomPick(DATE_PICKER_LABELS), [])
  const open = React.useMemo(() => Math.random() > 0.5, [])

  // Ant v5 uses Dayjs by default; no adapter needed.
  // We only care about varied visual states on initial render.

  useEffect(() => {
    const el = document.querySelector('.label_datepicker')
    if (el) {
      el.setAttribute('data-label', 'label_datepicker')
    }
  }, [])

  return (
    <Space direction="vertical" style={{ width: 320 }}>
      <Typography.Text type="secondary">{label}</Typography.Text>

      {variant === "date" && (
        <LabelWrap label={InteractiveLabel.datepicker}>
          <DatePicker
            classNames= {{
              popup: {
                root: 'label_datepicker'
              }
            }}
            value={value}
            onChange={(d) => d && setValue(d)}
            open={open}                 // show dropdown calendar on mount occasionally
            style={{ width: "100%" }}
            allowClear
          />
        </LabelWrap>
      )}

      {variant === "month" && (
        <DatePicker
          picker="month"              // Month picker mode
          value={value}
          onChange={(d) => d && setValue(d)}
          open={open}
          style={{ width: "100%" }}
          allowClear
        />
      )}

      {variant === "static" && (
        <Calendar
          value={value}
          onChange={(d) => setValue(d)}
          fullscreen={false}         // compact card calendar
          // month mode randomly for some variety:
          mode={Math.random() > 0.5 ? "month" : "year"}
          style={{ width: "100%" }}
        />
      )}
    </Space>
  )
}

export default AntDatePicker
