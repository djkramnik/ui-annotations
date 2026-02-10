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
  'data-label'?: string
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(function Flex(
  props,
  ref,
) {
  const { style, children, aic, jcsb, jcc, jcsa, wrap, col, gap} = props

  return (
    <div
      data-label={props['data-label']}
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
