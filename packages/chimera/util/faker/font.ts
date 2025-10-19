import { randInt } from "../random"

export function getRandomLocalFont(exclude: number[] = []) {
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
  ]

  return localFonts.filter((_, i) => !exclude.includes(i))[
    randInt(0, localFonts.length - exclude.length - 1)
  ] as string
}
