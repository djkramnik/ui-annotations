import { ChangeEventHandler, useCallback, useEffect, useRef, useState } from "react"
import { Flex } from "./flex"
import { getYoloModels } from "../api"


export const YoloModels = ({
  handleClick,
  disabled
}: {
  handleClick: (model: string) => void
  disabled?: boolean
}) => {
  const [models, setModels] = useState<string[] | null>(null)
  const selectRef = useRef<HTMLSelectElement | null>(null)

  const handleYoloClick = useCallback(() => {
    if (!selectRef.current) {
      return
    }
    const val = selectRef.current.value
    if (!val) {
      return
    }
    handleClick(val)
  }, [handleClick])

  useEffect(() => {
    getYoloModels()
      .then(models => setModels(models))
  }, [setModels])

  return (
    <Flex dir="column" gap="4px">
      <label htmlFor="yolo-select">Yolo Models</label>
      <select ref={selectRef} id="yolo-select" name="model" required>
        <option value="" defaultValue="">
          Select model
        </option>
        {models?.map((label) => {
          return (
            <option key={label} value={label}>
              {label}
            </option>
          )
        })}
      </select>
      <button disabled={!models || disabled} onClick={handleYoloClick}>
        Predict
      </button>
    </Flex>
  )
}