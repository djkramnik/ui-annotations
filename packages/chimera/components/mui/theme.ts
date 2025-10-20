import { createTheme } from "@mui/material/styles";
import { randInt, randomPick } from "../../util/random";
import { getRandomLocalFont } from "../../util/faker/font";
import { DARK_COLOR_SCHEMES, LIGHT_COLOR_SCHEMES } from "../../util/faker/color";
import { adjustColor } from "../../util/color";

export function randomMuiTheme() {
  const dark = Math.random() < 0.4
  const {
    primary,
    secondary,
    bgDefault,
    textPrimary,
    textSecondary
  } = dark
    ? randomPick(DARK_COLOR_SCHEMES)
    : randomPick(LIGHT_COLOR_SCHEMES)

  const bgPaper = adjustColor(bgDefault, randInt(0, 5) * (dark ? 1 : -1))

  const components = {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: bgDefault,
          color: textPrimary,
        },
      },
    },
    // Date pickers popper root inherits Paper styles; extra safety:
    MuiPickersPopper: {
      styleOverrides: {
        root: {
          "& .MuiPaper-root": {
            backgroundColor: bgPaper,
            color: textPrimary,
          },
        },
      },
    },
  } as const;

  return createTheme({
    palette: {
      mode: dark ? "dark" : "light",
      primary: { main: primary },
      secondary: { main: secondary },
      background: { default: bgDefault, paper: bgPaper },
      text: { primary: textPrimary, secondary: textSecondary },
    },
    typography: {
      fontFamily: Math.random() > 0.6
        ? `"Fira Sans","Roboto","Helvetica","Arial",sans-serif`
        : getRandomLocalFont()
    },
    shape: { borderRadius: [4, 6, 8, 10, 12][randInt(0, 4)] },
    components,
  });
}
