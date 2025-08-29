import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { AnnotationLabel } from 'ui-labelling-shared'
import { Prisma } from '@prisma/client'

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
  tag?: string
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

annotationRouter.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const tag = typeof _req.query.tag === 'string'
      ? _req.query.tag
      : null
    const where = tag
      ? Prisma.sql`WHERE a.tag = ${tag}`
      : Prisma.empty
    // --- constants for guaranteed keys ---
    const LABELS = Object.values(AnnotationLabel)
    type Label = (typeof LABELS)[number];
    type Bucket = Record<AnnotationLabel | 'url', number>;
    const zeroBucket = (): Bucket => ({ interactive: 0, textRegion: 0, button: 0, heading: 0, input: 0, url: 0 });
    const labelSet = new Set<string>(LABELS as readonly string[]);

    // --- queries ---
    const labelCountsQ = prisma.$queryRaw<
      { is_published: boolean; label: string | null; count: bigint }[]
    >`
      SELECT
        (COALESCE(a.published, 0) <> 0)        AS is_published,
        ann->>'label'                          AS label,
        COUNT(*)::bigint                       AS count
      FROM annotations a,
           jsonb_array_elements(COALESCE(a.payload->'annotations', '[]'::jsonb)) ann
      ${where}
      GROUP BY is_published, ann->>'label'
      ORDER BY is_published DESC, count DESC
    `;

    const urlCountQ = prisma.$queryRaw<
      { is_published: boolean; url_count: bigint }[]
    >`
      SELECT
        (COALESCE(published, 0) <> 0)          AS is_published,
        COUNT(DISTINCT url)::bigint            AS url_count
      FROM annotations a
      ${where}
      GROUP BY is_published
    `;

    const [labelRows, urlRows] = await Promise.all([labelCountsQ, urlCountQ]);

    // --- guaranteed shape with zeros ---
    const out: Record<'published' | 'draft', Bucket> = {
      published: zeroBucket(),
      draft: zeroBucket(),
    };

    // fill label counts
    for (const r of labelRows) {
      if (!r.label || !labelSet.has(r.label)) continue; // ignore unknown labels
      const bucket = r.is_published ? 'published' : 'draft';
      out[bucket][r.label as Label] = Number(r.count);
    }

    // fill url counts (zeros already present if missing)
    for (const r of urlRows) {
      const bucket = r.is_published ? 'published' : 'draft';
      out[bucket].url = Number(r.url_count);
    }

    res.status(200).json({ data: out});
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Unexpected error ' + err });
  }
});

annotationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      url,
      annotations,
      date,
      screenshot,
      window,
      tag
    } = req.body as AnnotationPayload;

    const record = await prisma.annotation.create({
      data: {
        tag: tag ?? null,
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
  const tag = (_req.query.tag as string | undefined)
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
      ),
       ...(
        typeof tag === 'string'
          ? {
            where: {
              tag
            }
          }
          : {}
      ),
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


