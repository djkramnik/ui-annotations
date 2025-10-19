import { VanillaTheme } from "../components/vanilla/type";

export const useRandomTheme = (): VanillaTheme => {
  return {
    palette: {
      backgroundColor: '#fff',
      primary: 'aliceblue',
      secondary: '#FFF7F0',
    },
    font: {
      fontFamily: {
        primary: getRandomLocalFont(),
        secondary: getRandomLocalFont()
      }
    }
  }
}

function randInt(_min: number, _max: number) {
  let min = Math.ceil(_min);
  let max = Math.floor(_max);
  if (max < min) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomLocalFont() {
  const localFonts = [
    `Roboto`,
    `StoryScript-Regular`,
    `"Playfair Display", serif`,
    `"Roboto Mono", monospace`,
    `"Lobster", sans-serif`,
    `"Oswald", sans-serif`,
    `"Merriweather", serif`,
    `"Noto Sans", sans-serif`,
    `"Lato", sans-serif`,
    `"Love Ya Like A Sister", cursive`,
    `"Lora", serif`,
    `"Lilita One", sans-serif`,
    `"Love Light", cursive`,
    `"Lexend", sans-serif`,
    `"Luckiest Guy", cursive`,
    `"Libre Bodoni", serif`,
    `Verdana`,
    `Phosphate`,
    `"Metal Mania", system-ui`,
    `"Michroma", sans-serif`,
    `"Macondo", cursive`,
    `Marcellus", serif`,
    `"Merienda", cursive`,
    `"Manufacturing Consent", system-ui`,
    `"Mr Dafoe", cursive`
  ]
  return localFonts[randInt(0, localFonts.length - 1)] as string
}