import { CSSProperties } from "react"


export const Flex = ({
  children,
  gap,
  dir,
  wrap,
  aic,
  jcsb,
  style
}: {
  children?: React.ReactNode
  gap?: string
  dir?: CSSProperties['flexDirection']
  wrap?: CSSProperties['flexWrap']
  aic?: boolean
  jcsb?: boolean
  style?: CSSProperties
}) => {
  return (
    <div style={{
      display: 'flex',
      gap,
      flexDirection: dir,
      flexWrap: wrap,
      ...(aic ? { alignItems: 'center'} : {}),
      ...(jcsb ? { justifyContent: 'space-between'} : {}),
      ...style
    }}>
      {children}
    </div>
  )
}