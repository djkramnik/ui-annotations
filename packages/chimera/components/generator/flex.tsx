import React, { CSSProperties } from 'react'

type FlexProps = {
  style?: CSSProperties
  children?: React.ReactNode
  col?: boolean
  aic?: boolean
  jcsb?: boolean
  jcc?: boolean
  jcsa?: boolean
  wrap?: boolean
  gap?: CSSProperties['gap']
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(function Flex(
  { style, children, aic, jcsb, jcc, jcsa, wrap, col, gap },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        ...(gap ? { gap } : {}),
        ...(col ? { flexDirection: 'column' } : {}),
        ...(aic ? { alignItems: 'center' } : {}),
        ...(jcsb ? { justifyContent: 'space-between' } : {}),
        ...(jcsa ? { justifyContent: 'space-around' } : {}),
        ...(jcc ? { justifyContent: 'center' } : {}),
        ...(wrap ? { flexWrap: 'wrap' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
})
