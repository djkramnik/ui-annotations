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

export const AntDatePicker = ({
  open
}: {
  open?: boolean
}) => {
  const [value, setValue] = React.useState<Dayjs>(() => randomPlausibleDate())
  const [variant] = React.useState<Variant>(() => pickVariant())
  const label = React.useMemo(() => randomPick(DATE_PICKER_LABELS), [])

  useEffect(() => {
    const label = open ? InteractiveLabel.calendar : InteractiveLabel.datepicker
    const selector = open ? '.ant-picker-panel-container' : '.ant-picker'
    setTimeout(() => {
      document.querySelector(selector)?.setAttribute('data-label', `label_${label}`)
    }, 1)
  }, [open])

  return (
    <Space direction="vertical" style={{ width: 320 }}>
      <Typography.Text type="secondary">{label}</Typography.Text>

      {variant === "date" && (
        <DatePicker
          value={value}
          onChange={(d) => d && setValue(d)}
          open={open}                 // show dropdown calendar on mount occasionally
          style={{ width: "100%" }}
          allowClear
        />
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
