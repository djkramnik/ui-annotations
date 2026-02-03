import { Checkbox } from "antd"
import { useEffect } from "react"
import { InteractiveLabel } from "ui-labelling-shared"

export const AntCheckboxGroup = ({
  title,
  options,
  selected
}: {
  title: string
  options: string[]
  // indexes of selected options
  selected?: number[]
}) => {
  useEffect(() => {
    document
      .querySelectorAll('input[type="checkbox"]')
      .forEach((el) => {
        el.setAttribute("data-label", `label_${InteractiveLabel.checkbox}`)
      })
  }, [])

  const defaultValues =
    selected && selected.length > 0
      ? selected
          .map((i) => options[i])
          .filter((v): v is string => typeof v === "string")
      : options[0]
      ? [options[0]]
      : []

  return (
    <div>
      <h4>{title}</h4>

      <Checkbox.Group defaultValue={defaultValues}>
        {options.map((o) => (
          <Checkbox id={o} key={o} value={o}>
            {o}
          </Checkbox>
        ))}
      </Checkbox.Group>
    </div>
  )
}
