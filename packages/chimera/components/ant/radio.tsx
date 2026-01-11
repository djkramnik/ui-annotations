import { Radio } from "antd"
import { useEffect } from "react"
import { InteractiveLabel } from "ui-labelling-shared"

export const AntRadioGroup = ({
  title,
  options,
  selected
}: {
  title: string
  options: string[]
  selected?: number
}) => {
  useEffect(() => {
    document.querySelectorAll('input[type="radio"]')
      .forEach(el => {
        el.setAttribute('data-label', `label_${InteractiveLabel.radio}`)
      })
  }, [])
  return (
    <div>
      <h4>{title}</h4>
      <Radio.Group defaultValue={options[selected ?? 0] ?? options[0]}>
        {
          options.map((o) => {
            return (
              <Radio id={o} key={o} value={o}>{o}</Radio>
            )
          })
        }
      </Radio.Group>
    </div>
  )
}