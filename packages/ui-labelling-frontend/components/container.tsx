export const Container = ({
  children,
}: {
  children?: React.ReactNode
}) => {
  return (
    <div style={{
      width: '96%',
      margin: 'auto',
      backgroundColor: '#eee'
    }}>
      {children}
    </div>
  )
}