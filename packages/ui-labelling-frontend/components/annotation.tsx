import { useCallback, useEffect, useState } from "react";
import { Flex } from "./flex";
import { useLabels } from "../hooks/labels";
import { AnnotationPayload } from "ui-labelling-shared";

export const AnnotationToggler = ({
  currIndex,
  annotations,
  handleUpdate,
  handleRemove,
  handlePrev,
  handleNext
}: {
  currIndex: number
  annotations: AnnotationPayload['annotations']
  handleUpdate: (label: string, index: number) => void
  handleRemove: (index: number) => void
  handlePrev: () => void
  handleNext: () => void
}) => {

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      switch(event.key) {
        case 'ArrowRight':
          handleNext()
          break
        case 'ArrowLeft':
          handlePrev()
          break
        case 'x':
          handleRemove(currIndex)
          break
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [handleNext, handlePrev, handleRemove, currIndex])

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
        <button onClick={handlePrev}>prev</button>
        <button onClick={handleNext}>next</button>
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

    const [currLabel, setCurrLabel] = useState<string>(annotation?.label ?? '')
    const labels = useLabels()

    useEffect(() => {
      if (!annotation) {
        return
      }
      setCurrLabel(annotation.label)
    }, [annotation, setCurrLabel])

    // this should never happen but it ain't my current fault (its my past self fault)
    if (!annotation) {
      return null
    }

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