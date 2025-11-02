import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import sharp from 'sharp'
import {
  boxesSimilar,
  getExtract,
  scaleRect,
  tightenBoundingBoxes,
} from '../util/screenshot'
import { Annotation } from 'ui-labelling-shared'

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export const utilRouter = Router()

// post
utilRouter.post('/crop', async (req: Request, res: Response) => {
  const body = req.body as { minRatio: number; maxRatio: number; total?: number; label?: string }

  const { minRatio, maxRatio, total, label } = body ?? {}
  if (typeof minRatio !== 'number' || typeof maxRatio !== 'number') {
    return res.status(400).send({ reason: 'missing min and max ratio' })
  }

  try {
    // Use a parameterized raw query
    const crops = await prisma.$queryRawUnsafe<
      Array<{ id: string; ogWidth: number; screenshot: Buffer; aspectRatio: number }>
    >(
      `
      SELECT id, "ogWidth", screenshot, "aspectRatio"
      FROM image_crop
      WHERE "aspectRatio" BETWEEN $1 AND $2
        AND ($3 = '*' OR "ogLabel" = $3)
      ORDER BY RANDOM()
      LIMIT $4
      `,
      minRatio,
      maxRatio,
      label ?? '*',  // if label is undefined, use '*'
      total ?? 10
    )

    res.status(200).send({
      data: crops.map(c => ({
        id: c.id,
        ogWidth: c.ogWidth,
        screenshot: Array.from(c.screenshot),
        aspectRatio: c.aspectRatio,
      })),
    })
  } catch (e) {
    console.error(e)
    res.status(500).send({ error: String(e) })
  }
})


utilRouter.post('/tighten/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    const screenshot = await prisma.screenshot.findFirstOrThrow({
      where: {
        id
      },
    })

    if (screenshot === null || !screenshot.image_data) {
      res
        .status(404)
        .send({ message: 'annotation with [id] has no screenshot ' })
      return
    }

    const { view_width: vw, view_height: vh, image_data } = screenshot
    const annotations = screenshot.annotations as Annotation[]

    const updatedBoxes = await tightenBoundingBoxes({
      b64: Buffer.from(image_data).toString('base64'),
      annotations,
      vw,
      vh,
    })

    res.status(200).send(
      updatedBoxes.map(({ rect, id }) => {
        const originalAnno = annotations.find((a) => a.id === id)!
        const similar = boxesSimilar(originalAnno!.rect, rect, {
          maxAspectDrift: 2,
          minAreaFrac: 0.6
        })
        if (similar.ok) {
          return { rect, id, similar }
        }
        return {
          rect: originalAnno.rect,
          id,
          similar,
        }
      }),
    )
  } catch (e) {
    res.status(500).send({ error: String(e) })
  }
})

utilRouter.post('/clips', async (req: Request, res: Response) => {
  const body = req.body as {
    rects: Rect[]
    fullScreen: string
    vw: number
    vh: number
    noScale?: boolean
  }
  const { rects, fullScreen, vw, vh, noScale } = body || {}
  if (!Array.isArray(rects)) {
    res.status(400).send({ reason: 'request body requires array of rects ' })
    return
  }
  if (typeof fullScreen !== 'string') {
    res
      .status(400)
      .send({ reason: 'need fullScreen base64 string in request body ' })
    return
  }
  if (typeof vw !== 'number' || typeof vh !== 'number') {
    res.status(400).send({ reason: 'Missing vw or vh number fields' })
    return
  }
  try {
    const buf = Buffer.from(fullScreen, 'base64')
    // if noscale is true we can omit the "expensive" instantiation of a sharp object
    // all of imgW, imgH, sx, sy are not needed in this scenario
    const img =
      noScale === true ? { width: 0, height: 0 } : await sharp(buf).metadata()
    const imgW = img.width
    const imgH = img.height
    const sx = imgW / vw
    const sy = imgH / vh

    const base64Clips = await Promise.all(
      rects.map((r) => {
        const scaled =
          noScale === true ? r : scaleRect({ rect: r, sx, sy, imgW, imgH })
        return getExtract({
          rect: {
            x: Math.round(scaled.x),
            y: Math.round(scaled.y),
            width: Math.round(scaled.width),
            height: Math.round(scaled.height),
          },
          buf,
        })
      }),
    )
    res.status(200).send({
      clips: base64Clips,
    })
  } catch (e) {
    console.error('failed to clip?', String(e))
    res.status(500).send({ error: String(e) })
  }
})

// put

utilRouter.put('/:id', async (req: Request, res: Response) => {
  const { rect } = req.body as {
    rect: Rect
  }
  try {
    const id = Number(req.params.id)
    const screenshot = await prisma.screenshot.findFirstOrThrow({
      where: {
        id,
      },
    })
    const { view_width: vw, view_height: vh, image_data } = screenshot

    if (image_data === null) {
      res
        .status(404)
        .send({ message: 'annotation with [id] has no screenshot ' })
      return
    }

    const buf = Buffer.from(image_data)
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
      imgH,
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
          blend: 'over',
        },
      ])
      .toBuffer()

    await prisma.screenshot.update({
      where: {
        id,
      },
      data: {
        image_data: newImg,
      },
    })

    // probably redundant, just being paranoid
    const newSavedScreen = await prisma.screenshot.findFirstOrThrow({
      where: {
        id,
      },
    })

    res
      .status(200)
      .send({ updatedScreen: Array.from(newSavedScreen.image_data!) })
  } catch (e) {
    res.status(500).send({ error: String(e) })
  }
})
