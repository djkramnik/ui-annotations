import { useCallback, useEffect, useState } from "react"
import { Annotation, Rect } from "../utils/type"

export const useAdjustRect = (annotation: Annotation | null, currIndex: number, mutate: boolean) => {
  const [adjust, setAdjust] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0})

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    switch(e.key) {
      case 'i':
        setAdjust(adjust => {
          return {...adjust, y: adjust.y - 1}
        })
        break
      case 'k':
        setAdjust(adjust => {
          return {...adjust, y: adjust.y + 1}
        })
        break
      case 'j':
        setAdjust(adjust => {
          return {...adjust, x: adjust.x - 1}
        })
        break
      case 'l':
        setAdjust(adjust => {
          return {...adjust, x: adjust.x + 1}
        })
        break
      case 'p': // p is for plus.  plus size
        setAdjust(adjust => {
          return {...adjust, width: adjust.width + 1, height: adjust.height + 1}
        })
        break
      case 'm': // scale down
        setAdjust(adjust => {
          return {...adjust, width: adjust.width - 1, height: adjust.height - 1}
        })
        break
      case 'q': // increase just the width
        setAdjust(adjust => ({ ...adjust, width: adjust.width + 1}))
        break
      case 'w': // decrease just the width
        setAdjust(adjust => ({ ...adjust, width: adjust.width - 1 }))
        break
      case 'a': // increase just the height
        setAdjust(adjust => ({ ...adjust, height: adjust.height + 1 }))
        break
      case 's': // decrease just the height
        setAdjust(adjust => ({ ...adjust, height: adjust.height - 1 }))
        break
    }
  }, [setAdjust])

  useEffect(() => {
    console.log('we doing this')
    // if annotation changes, reset the adjustment to default
    setAdjust({x: 0, y: 0, width: 0, height: 0})
    window.addEventListener('keypress', handleKeyPress)

    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [annotation, setAdjust, handleKeyPress, currIndex, mutate])

  return adjust
}