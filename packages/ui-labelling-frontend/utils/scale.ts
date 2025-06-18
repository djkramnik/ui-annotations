import { Rect } from "./type";

export const scaleRect = (og: Rect, scale: [number, number]) => {
  return {
    x: og.x * scale[0],
    y: og.y * scale[1],
    width: og.width * scale[0],
    height: og.height * scale[1]
  }
}