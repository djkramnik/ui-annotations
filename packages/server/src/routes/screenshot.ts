import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import sharp from 'sharp'

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export const screenshotRouter = Router()

function scaleRect({
  rect,
  sx,
  sy,
  imgW,
  imgH
}: {
  rect: Rect
  sx: number
  sy: number
  imgW: number
  imgH: number
}): Rect {

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
  return {
    x: ix,
    y: iy,
    width: iw,
    height: ih
  }
}

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

    const { x, y, width, height } = scaleRect({
      rect,
      sx,
      sy,
      imgW,
      imgH
    })

    const newImg = await img
      .composite([
        {
          input: {
            create: {
              width,
              height,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
          },
          left: x,
          top: y,
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
    res.status(500).send({ error: String(e) })
  }
})

async function getExtract({
  rect,
  buf
}: {
  rect: Rect,
  buf: Buffer
}): Promise<string> {
  return (
    await sharp(buf).extract({
      left: rect.x,
      top: rect.y,
      ...rect
    }).png().toBuffer()
  ).toString('base64')
}

screenshotRouter.post('/clips', async (req: Request, res: Response) => {
  const body = req.body as {
    rects: Rect[]
    fullScreen: string
    vw: number
    vh: number
  }
  const { rects, fullScreen, vw, vh } = body || {}
  if (!Array.isArray(rects)) {
    res.status(400).send({ reason: "request body requires array of rects "})
    return
  }
  if (typeof fullScreen !== 'string') {
    res.status(400).send({ reason: "need fullScreen base64 string in request body "})
    return
  }
  if (typeof vw !== 'number' || typeof vh !== 'number') {
    res.status(400).send({ reason: "Missing vw or vh number fields"})
    return
  }
  try {
    const buf = Buffer.from(fullScreen)
    const img = await sharp(buf).metadata()
    const imgW = img.width
    const imgH = img.height
    const sx = imgW / vw
    const sy = imgH / vh

    const base64Clips = await Promise.all(
      rects.map(r => {
        const scaled = scaleRect({ rect: r, sx, sy, imgW, imgH })
        return getExtract({
          rect: scaled,
          buf,
        })
      })
    )
    res.status(200).send({
      clips: base64Clips
    })
  } catch(e) {
    res.status(500).send({ error: String(e) })
  }
})

