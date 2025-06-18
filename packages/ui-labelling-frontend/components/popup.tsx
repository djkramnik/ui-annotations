import { CSSProperties, useEffect } from "react"

export const Popup = ({
  children,
  handleClose,
  containerStyle,
  cardStyle,
}: {
  children?: React.ReactNode
  handleClose?: () => void
  containerStyle?: CSSProperties
  cardStyle?: CSSProperties
}) => {

  useEffect(() => {
    // prevent scrolling

    return () => {
      // reenable scrolling
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 100,
      display: 'flex',
      ...containerStyle
    }}>
      {
        typeof handleClose === 'function'
          ? (
            <button onClick={handleClose} style={{
              position: 'absolute',
              top: '6px',
              right: '6px'
            }}>
              close
            </button>
          )
          : null
      }
      <div style={{
        margin: 'auto',
        padding: '12px',
        backgroundColor: 'white',
        borderRadius: '8px',
        ...cardStyle
      }}>
        {children}
      </div>
    </div>
  )
}