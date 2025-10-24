export const MultiLine = ({
  children
}: {
  children?: React.ReactNode
}) => {
  if (typeof children !== 'string') {
    return children
  }
  const splitText = children.split('\n')
  return (
    <>
      {
        splitText.map((text, idx) => {
          return (
            <>
              {text}
              {idx !== splitText.length - 1
                ? <br />
                : null}
            </>
          )
        })
      }
    </>
  )
}