import { Radio } from "antd"

export const AntRadioGroup = ({
  title,
  options,
  selected
}: {
  title: string
  options: string[]
  selected?: number
}) => {
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