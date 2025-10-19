import { createTheme } from "@mui/material/styles";
import { randInt, randomPick } from "../../util/random";
import { getRandomLocalFont } from "../../util/faker/font";

// Some plausible web-friendly base colors
const PRIMARY_COLORS = [
  "#1976d2", "#1e88e5", "#0288d1", "#3f51b5", "#2196f3", "#0d9488",
  "#2dd4bf", "#14b8a6", "#4f46e5", "#8b5cf6", "#10b981", "#16a34a",
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#06b6d4"
];
const SECONDARY_COLORS = [
  "#9c27b0", "#ab47bc", "#ec4899", "#e11d48", "#f43f5e", "#f97316",
  "#22c55e", "#06b6d4", "#6366f1", "#3b82f6", "#a855f7", "#7c3aed"
];

// Weighted random boolean (true 40% of time)
const randomDarkMode = () => Math.random() < 0.4;

export function randomMuiTheme() {
  const dark = randomDarkMode();
  const primary = randomPick(PRIMARY_COLORS)
  const secondary = randomPick(SECONDARY_COLORS)

  const backgroundDefault = dark
    ? ["#121212", "#1a1a1a", "#222", "#2a2a2a"][randInt(0, 3)]
    : ["#fafafa", "#f5f5f5", "#fffdf8", "#f9fafb"][randInt(0, 3)];

  const backgroundPaper = dark
    ? ["#1e1e1e", "#2c2c2c", "#303030", "#383838"][randInt(0, 3)]
    : ["#ffffff", "#fefefe", "#f8f9fa", "#fffefc"][randInt(0, 3)];

  const textPrimary = dark ? "#f5f5f5" : "#111827";
  const textSecondary = dark ? "#cccccc" : "#374151";

  return createTheme({
    palette: {
      mode: dark ? "dark" : "light",
      primary: { main: primary },
      secondary: { main: secondary },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
    },
    typography: {
      fontFamily: Math.random() > 0.5
        ? `"Fira Sans", "Roboto", "Helvetica", "Arial", sans-serif`
        : getRandomLocalFont(),
    },
    shape: {
      borderRadius: [4, 6, 8, 10, 12][randInt(0, 4)],
    },
  });
}
