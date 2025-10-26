import { useEffect, useState } from "react"
import { VanillaTheme } from "./type"
import { randInt } from "../../util/random"

export const RandomVariation = ({ variations, theme }: {
  variations: React.FC<{ theme: VanillaTheme }>[]
  theme: VanillaTheme
}) => {
  if (variations.length < 1) {
    throw Error('wtf no variations')
  }
  const [variant, setVariant] = useState<number>(0)
  useEffect(() => {
    setVariant(randInt(0, variations.length - 1))
  }, [setVariant, variations])

  const Variant = variations[variant]!
  return <Variant theme={theme} />
}