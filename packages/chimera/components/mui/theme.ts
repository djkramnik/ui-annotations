import { createTheme } from "@mui/material/styles";
import { randInt, randomPick } from "../../util/random";
import { getRandomLocalFont } from "../../util/faker/font";
import { DARK_COLOR_SCHEMES, LIGHT_COLOR_SCHEMES } from "../../util/faker/color";
import { adjustColor } from "../../util/color";

export function randomMuiTheme() {
  const dark = Math.random() < 0.4;
  const {
    primary,
    secondary,
    bgDefault,
    textPrimary,
    textSecondary,
  } = dark
    ? randomPick(DARK_COLOR_SCHEMES)
    : randomPick(LIGHT_COLOR_SCHEMES);

  const bgPaper = adjustColor(bgDefault, randInt(0, 5) * (dark ? 1 : -1));

  // ---- Shape / radius (shared) -----------------------------------------
  const radiusOptions = [0, 1, 2, 4, 6, 8, 10, 12];
  const shapeRadius = Math.random() > 0.4 ? randomPick(radiusOptions) : 0;

  // ---- Bullet “design tokens” ------------------------------------------
  const multipliers = [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
  const randomM = randomPick(multipliers);
  const bulletSizeRem = (0.55 + 0.05) * randomM;
  const bulletGapRem = (0.5 + 0.05) * randomM;

  // ---- Primary synthetic container (BOX + TABLE) -----------------------
  const primaryBgOffset = randInt(10, 20) * (dark ? 1 : -1);
  const primaryContainerBg = Math.random() > 0.6
    ? "transparent"
    : adjustColor(bgPaper, primaryBgOffset);

  const primaryBorderWidth = `${randomPick([1, 2])}px`;
  const primaryBorderBase = randomPick([textSecondary, primary, bgDefault]);
  const primaryBorderColor = adjustColor(primaryBorderBase, dark ? 5 : -5);

  const primaryHasShadow = Math.random() < 0.7;
  const primaryShadowIntensity = randomPick<"soft" | "medium" | "strong">(
    ["soft", "medium", "strong"]
  );
  const primaryBoxShadow = primaryHasShadow
    ? (() => {
        switch (primaryShadowIntensity) {
          case "soft":
            return "0px 1px 3px rgba(0,0,0,0.16)";
          case "medium":
            return "0px 2px 6px rgba(0,0,0,0.20)";
          case "strong":
            return "0px 4px 12px rgba(0,0,0,0.26)";
        }
      })()
    : "none";

  // ---- Secondary synthetic container (page_context / toc / toc_section) -

  const secondaryEnabled = Math.random() < 0.3; // 30%: lightly styled

  const secondaryBg = secondaryEnabled
    ? adjustColor(bgPaper, randInt(-5, 5) * (dark ? 1 : -1))
    : bgPaper;

  const secondaryBorderWidth = secondaryEnabled
    ? `${randomPick([0, 1])}px`
    : "0px";

  const secondaryBorderBase = randomPick([textSecondary, bgDefault]);
  const secondaryBorderColor = secondaryEnabled
    ? adjustColor(secondaryBorderBase, dark ? 3 : -3)
    : "transparent";

  const secondaryHasShadow = secondaryEnabled && Math.random() < 0.4;
  const secondaryBoxShadow = secondaryHasShadow
    ? "0px 1px 2px rgba(0,0,0,0.15)"
    : "none";

  // ---- Page frame container (page_frame) -------------------------------
  // Always some non-transparent background, no shadow, behind content.
  const pageFrameBgOffset = randInt(6, 16) * (dark ? 1 : -1);
  const pageFrameBg = adjustColor(bgPaper, pageFrameBgOffset);

  const pageFrameBorderWidth = `${randomPick([0, 1])}px`;
  const pageFrameBorderBase = randomPick([bgDefault, textSecondary]);
  const pageFrameBorderColor = pageFrameBorderWidth === "0px"
    ? "transparent"
    : adjustColor(pageFrameBorderBase, dark ? 3 : -3);

  const components = {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: bgDefault,
          color: textPrimary,
        },
      },
    },
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
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Bullet tokens
          "--my-bullet-size": `${bulletSizeRem}rem`,
          "--my-bullet-gap": `${bulletGapRem}rem`,

          // Primary container (box/table)
          "--synthetic-primary-bg": primaryContainerBg,
          "--synthetic-primary-border-width": primaryBorderWidth,
          "--synthetic-primary-border-color": primaryBorderColor,
          "--synthetic-primary-radius": `${shapeRadius}px`,
          "--synthetic-primary-shadow": primaryBoxShadow,

          // Secondary container (page_context / toc / toc_section)
          "--synthetic-secondary-bg": secondaryBg,
          "--synthetic-secondary-border-width": secondaryBorderWidth,
          "--synthetic-secondary-border-color": secondaryBorderColor,
          "--synthetic-secondary-radius": `${shapeRadius}px`,
          "--synthetic-secondary-shadow": secondaryBoxShadow,

          // Page frame container (page_frame)
          "--synthetic-page-frame-bg": pageFrameBg,
          "--synthetic-page-frame-border-width": pageFrameBorderWidth,
          "--synthetic-page-frame-border-color": pageFrameBorderColor,
          "--synthetic-page-frame-radius": `${shapeRadius}px`,
        },

        ".my-bullet": {
          display: "inline-block",
          width: "var(--my-bullet-size)",
          height: "var(--my-bullet-size)",
          borderRadius: "50%",
          backgroundColor: "currentColor",
          marginRight: "var(--my-bullet-gap)",
          flexShrink: 0,
        },

        // PRIMARY containers: BOX + TABLE
        ".synthetic-container-table, \
         .synthetic-container-box": {
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: "var(--synthetic-primary-bg)",
          borderRadius: "var(--synthetic-primary-radius)",
          borderStyle: "solid",
          borderWidth: "var(--synthetic-primary-border-width)",
          borderColor: "var(--synthetic-primary-border-color)",
          boxShadow: "var(--synthetic-primary-shadow)",
          zIndex: -1,
        },

        // SECONDARY containers: page_context / toc / toc_section
        ".synthetic-container, \
         .synthetic-container-page_context, \
         .synthetic-container-toc, \
         .synthetic-container-toc_section": {
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: "var(--synthetic-secondary-bg)",
          borderRadius: "var(--synthetic-secondary-radius)",
          borderStyle: "solid",
          borderWidth: "var(--synthetic-secondary-border-width)",
          borderColor: "var(--synthetic-secondary-border-color)",
          boxShadow: "var(--synthetic-secondary-shadow)",
          zIndex: -1,
        },

        // PAGE FRAME container: always non-transparent bg, no shadow
        ".synthetic-container-page_frame": {
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: "var(--synthetic-page-frame-bg)",
          borderStyle: "solid",
          borderWidth: "var(--synthetic-page-frame-border-width)",
          borderColor: "var(--synthetic-page-frame-border-color)",
          boxShadow: "none",
          zIndex: -1,
        },
      },
    },
  } as const;

  const theme = createTheme({
    palette: {
      mode: dark ? "dark" : "light",
      primary: { main: primary },
      secondary: { main: secondary },
      background: { default: bgDefault, paper: bgPaper },
      text: { primary: textPrimary, secondary: textSecondary },
    },
    typography: {
      fontFamily:
        Math.random() > 0.6
          ? `"Fira Sans","Roboto","Helvetica","Arial",sans-serif`
          : getRandomLocalFont(),
    },
    shape: { borderRadius: shapeRadius },
    components,
  });

  return theme;
}
