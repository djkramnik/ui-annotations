import { useCallback, useEffect, useState } from "react";
import { AnnotationPayload } from "../utils/type";
import { Flex } from "./flex";
import { useLabels } from "../hooks/labels";

export const AnnotationToggler = ({
  annotations,
  handleIndexChange,
  handleUpdate,
  handleRemove,
}: {
  annotations: AnnotationPayload['annotations']
  handleIndexChange: (newIndex: number) => void
  handleUpdate: (label: string, index: number) => void
  handleRemove: (index: number) => void
}) => {
  const [currIndex, setCurrIndex] = useState<number>(0)

  const prev = useCallback(() => {
    setCurrIndex(index => index === 0 ? annotations.length - 1 : index - 1)
  }, [setCurrIndex, annotations])
  const next = useCallback(() => {
    setCurrIndex(index => (index + 1) % annotations.length)
  }, [setCurrIndex, annotations])

  useEffect(() => {
    handleIndexChange(currIndex)
  }, [currIndex])

  return (
    <Flex dir="column" gap="8px">
      <SelectedAnnotation
        index={currIndex}
        annotation={annotations[currIndex]}
        handleUpdate={handleUpdate}
        handleRemove={handleRemove}
      >
        <p>The green rectangle on the screenshot is the bounding box of this annotation.
          Keypress `i,j,k,l` to reposition. `p` to scale size up, `m` to scale size down
          'q' and 'w' to increase and decrease width, 'a' and 's' to increase and decrease height.
        </p>
      </SelectedAnnotation>
      <Flex gap="8px">
        <button onClick={prev}>prev</button>
        <button onClick={next}>next</button>
      </Flex>
    </Flex>
  )
}



export const SelectedAnnotation = (
  {
    index,
    annotation,
    handleUpdate,
    handleRemove,
    children,
  }: {
    index: number
    annotation: AnnotationPayload['annotations'][0]
    handleUpdate: (label: string, index: number) => void
    handleRemove: (index: number) => void
    children?: React.ReactNode
  }) => {
    const [currLabel, setCurrLabel] = useState<string>(annotation.label)
    const labels = useLabels()
    return (
      <Flex dir="column" gap="8px">
        <h4 style={{ margin: 0 }}>
          Index: {index}
        </h4>
        <h4 style={{ margin: 0}}>
          Original Label: {annotation.label}
        </h4>
        <Flex>
          <form onSubmit={e => {
            e.preventDefault()
            handleUpdate(currLabel, index)
          }}>
            <Flex dir="column" gap="4px">
              <label htmlFor="label-select" style={{ fontWeight: 'bold' }}>Label:</label>
              <select id="label-select" name="label" required value={currLabel}
                onChange={e => setCurrLabel(e.target.value)}>
                <option value="" disabled selected>Select label</option>
                {
                  labels.map(label => {
                    return (
                      <option key={label} value={label}>{label}</option>
                    )
                  })
                }
              </select>
            </Flex>
            {children}
            <button type="submit" style={{ marginTop: '4px' }}>Update</button>
          </form>
        </Flex>
        <button onClick={e => handleRemove(index)}>Delete</button>
      </Flex>
    )
}