import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: `"Fira Sans", "Roboto", "Helvetica", "Arial", sans-serif`,
  },
  palette: {
    primary: {
      main: "#1976d2",   // blue
    },
    secondary: {
      main: "#9c27b0",   // purple
    },
    background: {
      default: "#333",
    },
    text: {
      primary: '#fafafa',
      secondary: '#fafafa'
    }
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
