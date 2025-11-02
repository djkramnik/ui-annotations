import { Annotation, Rect } from "ui-labelling-shared"

export const adjustAnnotation = (annotation: Annotation, adjust: Rect) => {
  return {
    ...annotation,
    rect: {
      x: annotation.rect.x + adjust.x,
      y: annotation.rect.y + adjust.y,
      width: annotation.rect.width * (1 + (adjust.width * 0.01)),
      height: annotation.rect.height * (1 + (adjust.height * 0.01)),
    }
  }
}