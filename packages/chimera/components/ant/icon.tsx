import * as React from "react"
import type { IconBaseProps } from "@ant-design/icons/lib/components/Icon" // type-only import
import { randInt } from "../../util/random"

type AntIconComponent = React.ComponentType<IconBaseProps>

export const RandomAntIcon = ({
  icons,
  sizeRange,
}: {
  icons: AntIconComponent[]
  sizeRange?: [number, number]
}) => {
  const [minSize, maxSize] = sizeRange ?? [30, 70]
  const size = randInt(minSize, maxSize)
  const Icon = icons[randInt(0, icons.length - 1)]

  // Ant icons scale with fontSize on the wrapper <span>
  return <Icon style={{ fontSize: size }} />
}
