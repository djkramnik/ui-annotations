import { Annotations } from "ui-labelling-shared"
import { Flex } from "./flex"
import { Base64Img } from "./base64-img"

export function PreviewAnnotation({ annotations }: { annotations: Annotations }) {
  const { screenshot } = annotations

  return (
    <Flex gap="12px">
      <Flex aic>
        <Base64Img
          source={screenshot}
          style={{ width: '200px', border: '1px solid black' }}
        />
      </Flex>
      <Flex>
        <ul>
          <li>id: {annotations.id}</li>
          <li>width: {annotations.viewWidth}</li>
          <li>height: {annotations.viewHeight}</li>
          <li>tag: {annotations.tag ?? 'no tag'}</li>
        </ul>
      </Flex>
    </Flex>
  )
}