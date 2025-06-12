import { Router, Request, Response } from 'express'
import { prisma } from '../db'

export const annotationRouter = Router()

type AnnotationPayload = {
  url: string
  date: string
  window: {
      scrollY: number
      width: number
      height: number
  }
  annotations: {
      id: string
      rect: {
        x: number
        y: number
        width: number
        height: number
      }
      label: string
  }[]
  screenshot: string
}

annotationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      url,
      annotations,
      date,
      screenshot,          // base-64 string or undefined
      window               // { scrollY, innerWidth, innerHeight, … }
    } = req.body as AnnotationPayload;

    const record = await prisma.annotation.create({
      data: {
        scrollY:   window.scrollY,
        viewWidth: window.width,
        viewHeight: window.height,
        date:      new Date(date),                  // ISO string → Date
        url,
        payload: {
          annotations,
        },
        screenshot: screenshot
          ? Buffer.from(screenshot, 'base64')
          : undefined,
      },
      select: { id: true },
    });

    res.status(200).send({ data: record.id });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Unexpected error ' + err });
  }
})

annotationRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.annotation.findMany({
      select: { id: true, url: true },
      orderBy: { id: 'asc' },
    });

    res.status(200).send({ data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
});

annotationRouter.get('/:id', async (req: Request, res: Response) => {
  const annotationId = Number(req.params.id)

  try {
    const row = await prisma.annotation.findUnique({
      where: { id: annotationId },
    })

    if (!row) {
      res
        .status(404)
        .send({ message: 'Could not find annotation with id ' + annotationId })
      return
    }

    // Convert binary screenshot to base-64 so the API contract stays the same
    const data = {
      ...row,
      screenshot: row.screenshot ? (row.screenshot as Buffer).toString('base64') : null,
    }

    res.status(200).send({ data })
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})
