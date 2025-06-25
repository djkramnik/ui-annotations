import { useCallback, useEffect } from "react";
import { PageMode } from "../utils/type";

export const useMode = (curr: PageMode, setMode: (mode: PageMode) => void) => {

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    switch(e.key) {
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