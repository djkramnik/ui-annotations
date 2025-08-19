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

annotationRouter.delete('/:id', async (req: Request, res: Response) => {
  const annotationId = Number(req.params.id)
  try {
    await prisma.annotation.delete({
      where: { id: annotationId },
    })

    res.status(200).send({ data: {
      id: annotationId
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

annotationRouter.put('/publish/:id', async (req: Request, res: Response) => {
  const annotationId = Number(req.params.id)
  try {
    const row = await prisma.annotation.update({
      where: { id: annotationId },
      data: { published: 1 }
    })

    res.status(200).send({ data: {
      ...row,
      screenshot: Array.from(row.screenshot!)
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

annotationRouter.put('/unpublish/:id', async (req: Request, res: Response) => {
  const annotationId = Number(req.params.id)
  try {
    const row = await prisma.annotation.update({
      where: { id: annotationId },
      data: { published: 0 }
    })

    res.status(200).send({ data: {
      ...row,
      screenshot: Array.from(row.screenshot!)
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

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

// this updates only the annotations not the metadata
annotationRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const annotationId = Number(req.params.id)
    const {
      annotations,
    } = req.body as Pick<AnnotationPayload, 'annotations'>

    const record = await prisma.annotation.update({
      data: {
        payload: {
          annotations,
        },
      },
      where: {
        id: annotationId
      }
    })
    res.status(200).send({ data: record })
  } catch(err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

annotationRouter.get('/', async (_req: Request, res: Response) => {
  const published = _req.query.published as string

  try {
    const rows = await prisma.annotation.findMany({
      select: { id: true, url: true, scrollY: true, date: true },
      orderBy: { id: 'asc' },
      ...(
        typeof published === 'string'
          ? {
            where: {
              published: published === '1' ? 1 : 0,
            }
          }
          : {}
      )
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

    res.status(200).send({ data: {
      ...row,
      screenshot: Array.from(row.screenshot!)
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

annotationRouter.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const labelCountsQ = prisma.$queryRaw<
      { label: string; count: bigint }[]
    >`
      SELECT
        ann->>'label' AS label,
        COUNT(*)::bigint AS count
      FROM annotations,
           jsonb_array_elements(payload->'annotations') ann
      GROUP BY ann->>'label'
      ORDER BY count DESC
    `;

    const urlCountQ = prisma.$queryRaw<
      { url_count: bigint }[]
    >`
      SELECT COUNT(DISTINCT url)::bigint AS url_count
      FROM annotations
    `;

    const [labelRows, urlRows] = await Promise.all([labelCountsQ, urlCountQ]);

    const out: Record<string, number> = {
      ...(labelRows.reduce((acc, r) => {
        if (typeof r.label !== 'string') {
          return acc
        }
        return {
          ...acc,
          [r.label]: Number(r.count)
        }
      }, {} as Record<string, number>)),
      url: Number(urlRows[0].url_count)
    }

    res.status(200).json(out);

  } catch(err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})
