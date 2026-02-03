import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
} from "@mui/material"
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank"
import CheckBoxIcon from "@mui/icons-material/CheckBox"

export const MuiCheckboxGroup = ({
  title,
  options,
  selected,
}: {
  title: string
  options: string[]
  // indexes of selected options
  selected?: number[]
}) => {
  const defaultSelectedValues =
    selected && selected.length > 0
      ? selected
          .map((i) => options[i])
          .filter((v): v is string => typeof v === "string")
      : options[0]
      ? [options[0]]
      : []

  return (
    <FormControl>
      <FormLabel id="demo-checkbox-group-label">{title}</FormLabel>

      <FormGroup aria-labelledby="demo-checkbox-group-label">
        {options.map((o) => (
          <FormControlLabel
            key={o}
            label={o}
            control={
              <Checkbox
                id={o}
                defaultChecked={defaultSelectedValues.includes(o)}
                icon={<CheckBoxOutlineBlankIcon data-label="label_checkbox" />}
                checkedIcon={<CheckBoxIcon data-label="label_checkbox" />}
              />
            }
          />
        ))}
      </FormGroup>
    </FormControl>
  )
}
