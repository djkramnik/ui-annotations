export type VanillaTheme = {
  palette: {
    backgroundColor: string
    primary: string
    secondary?: string
    typography: {
      primary: string
      button: string
      secondary?: string
    }
  },
  font: {
    fontFamily: {
      primary: string
      secondary?: string
    }
  }
}