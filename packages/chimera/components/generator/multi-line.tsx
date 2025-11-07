import React from "react"

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
            <React.Fragment key={idx}>
              {text}
              {idx !== splitText.length - 1
                ? <br />
                : null}
            </React.Fragment>
          )
        })
      }
    </>
  )
}