import {useState, useMemo, useLayoutEffect} from "react"
import { randomBgCssSimilarLightness } from "../util/color"

export function useRandomizedBackground(
) {
  const [bg, setBg] = useState<string | null>(null)
  const dark = useMemo(() => Math.random() > 0.5, [])

  useLayoutEffect(() => {
    setBg(randomBgCssSimilarLightness(dark))
  }, [setBg, dark])

  return bg
}
