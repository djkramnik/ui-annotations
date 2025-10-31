import { Screenshot } from "ui-labelling-shared"
import { Flex } from "./flex"
import { Base64Img } from "./base64-img"

export function PreviewScreenshot({ screenshot }: { screenshot: Screenshot }) {
  return (
    <Flex gap="12px">
      <Flex aic>
        <Base64Img
          source={screenshot.image_data}
          style={{ width: '200px', border: '1px solid black' }}
        />
      </Flex>
      <Flex>
        <ul>
          <li>id: {screenshot.id}</li>
          <li>width: {screenshot.view_width}</li>
          <li>height: {screenshot.view_height}</li>
          <li>tag: {screenshot.tag ?? 'no tag'}</li>
        </ul>
      </Flex>
    </Flex>
  )
}