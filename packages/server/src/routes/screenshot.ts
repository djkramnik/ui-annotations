import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { AnnotationLabel } from 'ui-labelling-shared'
import { Prisma } from '@prisma/client'
import sharp from 'sharp'

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export const screenshotRouter = Router()

screenshotRouter.put('/:id', async (req: Request, res: Response) => {
  const { rect } = req.body as {
    rect: Rect
  }
  try {
    const annotationId = Number(req.params.id)
    const annotation = await prisma.annotation.findFirstOrThrow({
      where: {
        id: annotationId
      }
    })
    const vw = annotation.viewWidth
    const vh = annotation.viewHeight
    const ogScreen = annotation.screenshot
    if (ogScreen === null) {
      res.status(404).send({ message: 'annotation with [id] has no screenshot '})
      return
    }

    const buf = Buffer.from(ogScreen)
    const img = sharp(buf)
    const meta = await img.metadata()
    const imgW = meta.width ?? vw
    const imgH = meta.height ?? vh

    const sx = imgW / vw
    const sy = imgH / vh

    const { x, y, width, height } = rect
    let ix = Math.round(x * sx);
    let iy = Math.round(y * sy);
    let iw = Math.round(width * sx);
    let ih = Math.round(height * sy);

    // Clamp to image bounds (avoids errors if rect spills out)
    ix = Math.max(0, Math.min(ix, imgW - 1));
    iy = Math.max(0, Math.min(iy, imgH - 1));
    iw = Math.max(0, Math.min(iw, imgW - ix));
    ih = Math.max(0, Math.min(ih, imgH - iy));


    const newImg = await img
      .composite([
        {
          input: {
            create: {
              width: iw,
              height: ih,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
          },
          left: ix,
          top: iy,
          blend: "over",
        },
      ])
      .toBuffer();

    await prisma.annotation.update({
      where: {
        id: annotationId
      },
      data: {
        screenshot: newImg
      }
    })

    // probably redundant, just being paranoid
    const newSavedScreen = await prisma.annotation.findFirstOrThrow({
      where: {
        id: annotationId
      }
    })

    res.status(200).send({ updatedScreen: Array.from(newSavedScreen.screenshot!) })
  } catch(e) {
    res.status(500).send({ error: String(e )})
  }
})


