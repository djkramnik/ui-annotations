import { useCallback, useEffect } from "react";
import { PageMode } from "../utils/type";

export const useMode = (curr: PageMode, setMode: (mode: PageMode) => void) => {

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof Element) {
      if (e.target.tagName.toLowerCase() === 'textarea' ||
        e.target.tagName.toLowerCase() === 'input') {
        return
      }
    }
    switch(e.key) {
      case 'i':
        setMode('initial')
        break
      case 'd':
        setMode('draw')
        break
      case 't':
        setMode('toggle')
        break
      case 'z':
        setMode('initial')
        break
    }
  }, [curr, setMode])

  useEffect(() => {
    window.addEventListener('keypress', handleKeyPress)

    return () => {
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [handleKeyPress])
}