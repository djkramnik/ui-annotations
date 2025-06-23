import { useCallback, useEffect, useState } from "react"
import { Annotation, Rect } from "../utils/type"

export const useAdjustRect = (annotation: Annotation | null) => {
  const [adjust, setAdjust] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0})

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    switch(e.key) {
      case 'i':
        setAdjust(adjust => {
          if (!adjust) return adjust
          adjust.y -= 1
          return {...adjust}
        })
        break
      case 'k':
        setAdjust(adjust => {
          if (!adjust) return adjust
          adjust.y += 1
          return {...adjust}
        })
        break
      case 'j':
        setAdjust(adjust => {
          if (!adjust) return adjust
          adjust.x -= 1
          return {...adjust}
        })
        break
      case 'l':
        setAdjust(adjust => {
          if (!adjust) return adjust
          adjust.x += 1
          return {...adjust}
        })
        break
    }
  }, [setAdjust])

  useEffect(() => {
    // if annotation changes, reset the adjustment to default
    setAdjust({x: 0, y: 0, width: 0, height: 0})
    window.addEventListener('keypress', handleKeyPress)

    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [annotation, setAdjust, handleKeyPress])

  return adjust
}