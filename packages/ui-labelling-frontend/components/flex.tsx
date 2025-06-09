import { CSSProperties } from "react"


export const Flex = ({
  children,
  gap,
  dir,
  wrap,
  style
}: {
  children?: React.ReactNode
  gap?: string
  dir?: CSSProperties['flexDirection']
  wrap?: CSSProperties['flexWrap']
  style?: CSSProperties
}) => {
  return (
    <div style={{
      display: 'flex',
      gap,
      flexDirection: dir,
      flexWrap: wrap,
      ...style
    }}>
      {children}
    </div>
  )
}