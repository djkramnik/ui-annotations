import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { Annotation, AnnotationLabel, ScreenshotRequest } from 'ui-labelling-shared'
import { Prisma } from '@prisma/client'

export const screenshotRouter = Router()

screenshotRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  try {
    // this will delete related annotations
    await prisma.screenshot.delete({
      where: { id: id },
    })
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

// deprecated.  needs rewriting post annotations in their own table
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

    const id = await prisma.$transaction(async ($tx) => {
      const record = await $tx.screenshot.create({
        data: {
          tag: tag ?? null,
          scroll_y:   window.scrollY,
          view_width: window.width,
          view_height: window.height,
          date:      new Date(date),
          url,
          annotations: [],
          image_data: image_data
            ? Buffer.from(image_data, 'base64')
            : undefined,
        },
        select: { id: true },
      });

      await $tx.annotation.createMany({
        data: annotations.map(a => ({
          id: a.id,
          label: a.label,
          x: a.rect.x,
          y: a.rect.y,
          width: a.rect.width,
          height: a.rect.height,
          aspect_ratio: Number((a.rect.width / a.rect.height).toFixed(2)),
          text_content: a.textContent || undefined,
          screenshot_id: record.id
        }))
      })
    })
    res.status(200).send({ data: id });

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

    const existing = await prisma.screenshot.findFirst({
      where: {
        id
      }
    })
    if (!existing) {
      res.status(404).send({ reason: 'No screenshot with that id '})
      return
    }

    await prisma.$transaction(async ($tx) => {
      await $tx.annotation.deleteMany({
        where: {
          screenshot_id: id
        }
      })
      await $tx.annotation.createMany({
        data: annotations.map(a => ({
          id: a.id,
          label: a.label,
          text_content: a.textContent,
          x: a.rect.x,
          y: a.rect.y,
          width: a.rect.width,
          height: a.rect.height,
          aspect_ratio: Number((a.rect.width / a.rect.height).toFixed(2)),
          screenshot_id: id
        }))
      })

    })

    res.status(200).send({ data: {
      ...existing,
      annotations
    } })
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
      include: {
        annotation: true
      },
    })

    if (!row) {
      res
        .status(404)
        .send({ message: 'Could not find screenshot with id ' + id })
      return
    }
    // annotations is the deprecated json column.  At some point we should delete it
    const { annotations, annotation, ...rest } = row

    res.status(200).send({ data: {
      ...rest,
      image_data: Array.from(row.image_data!),
      annotations: annotation.map(a => ({
        id: a.id,
        label: a.label,
        rect: {
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height
        },
        textContent: a.text_content
      })) as Annotation[]
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})


