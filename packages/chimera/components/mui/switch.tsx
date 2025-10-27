import { Switch } from '@mui/material'
import { styled } from '@mui/material/styles'

export const WrappedSwitch = styled(Switch)(({ theme }) => ({
  width: 46,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 3,
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.primary.main,
        opacity: 1,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    width: 20,
    height: 20,
    boxShadow: 'none',
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.grey[400],
    opacity: 1,
  },
}))
