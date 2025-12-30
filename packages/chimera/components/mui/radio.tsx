import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from "@mui/material"
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';

export const MuiRadioGroup = ({
  title,
  options,
  selected
}: {
  title: string
  options: string[]
  selected?: number
}) => {
  return (
    <FormControl>
      <FormLabel id="demo-radio-buttons-group-label">{title}</FormLabel>
      <RadioGroup
        aria-labelledby="demo-radio-buttons-group-label"
        defaultValue={options[selected ?? 0] ?? options[0]}
        name="radio-buttons-group"
      >
        {
          options.map(o => {
            return (
              <FormControlLabel key={o} value={o} control={
                <Radio
                  id={o}
                  icon={
                    <RadioButtonUncheckedIcon data-label="label_radio" />
                  }
                  checkedIcon={
                    <RadioButtonCheckedIcon data-label="label_radio" />
                  }
                />
              } label={o} />
            )
          })
        }
      </RadioGroup>
    </FormControl>
  )
}