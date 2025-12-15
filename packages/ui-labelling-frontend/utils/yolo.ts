// given a response from backend yolo inference, of type YoloPredictResponse,

import { Annotation, YoloPredictResponse } from "ui-labelling-shared"

export type AnnotationBox = Pick<Annotation, 'rect' | 'label'> & { conf: number }

// convert into the annotations format and perform scaling along the way
export const parseAnnotationsFromYoloResponse = ({
  viewWidth,
  viewHeight,
  response
}: {
  viewWidth: number
  viewHeight: number
  response: YoloPredictResponse
}): AnnotationBox[] => {
  // we have to convert from raster scaled (old dim) to css scaled (new dim)
  const sx = getScale(response.imgWidth, viewWidth)
  const sy = getScale(response.imgHeight, viewHeight)

  return response.detections.map(d => {
    const [x0, y0, x1, y1] = d.box
    const sx0 = x0 * sx
    const sy0 = y0 * sy
    const sx1 = x1 * sx
    const sy1 = y1 * sy

    return ({
      conf: d.conf,
      label: d.label,
      rect: {
        x: sx0,
        y: sy0,
        width: sx1 - sx0,
        height: sy1 - sy0,
      }
    })
  })
}

// scale variable is new dimension (what number is being scaled to) / old dimension (the current scale of the value)
export const getScale = (oldDim: number, newDim: number) => newDim / oldDim