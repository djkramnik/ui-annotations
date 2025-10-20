import { randInt } from "../../util/random"
import { VanillaTheme } from "./type"

export const VanillaButton = ({
  theme,
  children,
}: {
  theme: VanillaTheme
  children?: React.ReactNode
}) => {
  const padding = randInt(4, 12)
  const br = randInt(4, 12)
  const noBr = randInt(0, 2) < 1
  const allCaps = randInt(0, 2) < 1
  const withMinButtonWidth = Math.random() > 0.5
  const minButtonWidth = randInt(50, 80)
  return (
    <button style={{
      minWidth: withMinButtonWidth
        ? `${minButtonWidth}%`
        : 'initial',
      fontFamily: theme.font.fontFamily.secondary ?? theme.font.fontFamily.primary,
      textTransform: allCaps
        ? 'uppercase'
        : 'initial',
      outline: 'none',
      border: 'none',
      backgroundColor: theme.palette.primary,
      color: theme.palette.typography.button,
      borderRadius: noBr
        ? '0px'
        : `${br}px`,
      padding: `${padding}px`
    }}>{children}</button>
  )
}