import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { AnnotationLabel, ScreenshotRequest } from 'ui-labelling-shared'
import { Prisma } from '@prisma/client'

export const screenshotRouter = Router()

screenshotRouter.delete('/:id', async (req: Request, res: Response) => {
  const annotationId = Number(req.params.id)
  try {
    await prisma.screenshot.delete({
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

screenshotRouter.put('/publish/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  try {
    const row = await prisma.screenshot.update({
      where: { id },
      data: { published: 1 }
    })

    res.status(200).send({ data: {
      ...row,
      image_data: Array.from(row.image_data!) // is this really necessary
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

screenshotRouter.put('/unpublish/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  try {
    const row = await prisma.screenshot.update({
      where: { id },
      data: { published: 0 }
    })

    res.status(200).send({ data: {
      ...row,
      image_data: Array.from(row.image_data!)
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

screenshotRouter.get('/analytics', async (_req: Request, res: Response) => {
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
        (COALESCE(a.published, 0) <> 0) AS is_published,
        ann->>'label'                   AS label,
        COUNT(*)::bigint                AS count
      FROM screenshot a,
          jsonb_array_elements(COALESCE(a.annotations, '[]'::jsonb)) AS ann
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
      FROM screenshot a
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

screenshotRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      url,
      annotations,
      date,
      image_data,
      window,
      tag
    } = req.body as ScreenshotRequest;

    const record = await prisma.screenshot.create({
      data: {
        tag: tag ?? null,
        scroll_y:   window.scrollY,
        view_width: window.width,
        view_height: window.height,
        date:      new Date(date),                  // ISO string → Date
        url,
        annotations,
        image_data: image_data
          ? Buffer.from(image_data, 'base64')
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
screenshotRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id)
    const {
      annotations,
    } = req.body as Pick<ScreenshotRequest, 'annotations'>

    const record = await prisma.screenshot.update({
      data: {
        annotations
      },
      where: {
        id
      }
    })
    res.status(200).send({ data: record })
  } catch(err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

screenshotRouter.get('/', async (_req: Request, res: Response) => {
  const published = _req.query.published as string
  const tag = (_req.query.tag as string | undefined)
  try {
    const rows = await prisma.screenshot.findMany({
      select: { id: true, url: true, scroll_y: true, date: true },
      orderBy: { id: 'asc' },
      where: {
        ...(
          typeof published === 'string'
            ? {
                published: published === '1' ? 1 : 0,
            }
            : {}
        ),
        ...(
          typeof tag === 'string'
            ? {
                tag: tag
            }
            : {}
        ),
      }
    });

    res.status(200).send({ data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
});

screenshotRouter.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)

  try {
    const row = await prisma.screenshot.findUnique({
      where: { id },
    })

    if (!row) {
      res
        .status(404)
        .send({ message: 'Could not find screenshot with id ' + id })
      return
    }

    res.status(200).send({ data: {
      ...row,
      image_data: Array.from(row.image_data!)
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})


