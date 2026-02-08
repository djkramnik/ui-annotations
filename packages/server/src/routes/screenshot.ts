import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { Annotation, AnnotationLabel, Screenshot, ScreenshotRequest } from 'ui-labelling-shared'
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

screenshotRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      url,
      annotations,
      date,
      image_data,
      window,
      tag,
      synthetic_parent_id
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
          synthetic_parent_id
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
          text_content: a.text_content || undefined,
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
          text_content: a.text_content,
          x: a.rect.x,
          y: a.rect.y,
          width: a.rect.width,
          height: a.rect.height,
          aspect_ratio: Number((a.rect.width / a.rect.height).toFixed(2)),
          screenshot_id: id,
          clean: a.clean
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

// todo: paginate this
screenshotRouter.get('/', async (_req: Request, res: Response) => {
  const published = _req.query.published as string
  const tag = (_req.query.tag as string | undefined)
  const synthetic = _req.query.synthetic as string

  try {
    const rows = await prisma.screenshot.findMany({
      select: { id: true, url: true, scroll_y: true, date: true, synthetic_parent_id: true },
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
        ...(
          synthetic === 'true'
            ? {
              synthetic_parent_id: {
                not: null
              }
            }
            : (
              synthetic === 'false'
                ? {
                  synthetic_parent_id: null
                }
                : {}
            )
        )
      }
    });

    res.status(200).send({ data: rows })
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
});

screenshotRouter.get('/sequence/:id', async (req: Request, res: Response) => {
  const id = Number(String(req.params.id))
  if (Number.isNaN(id)) {
    res.status(400).send({ reason: 'invalid id '})
    return
  }
  try {
    const target = await prisma.screenshot.findFirstOrThrow({
      where: {
        id
      },
      include: {
        annotation: true
      }
    })
    // return the actual record plus the next and prev records
    // that have the same tag and published value

    const [prev,next] = await Promise.all([
      prisma.screenshot.findFirst({
        select: {
          id: true
        },
        where: {
          id: {
            lt: target.id
          },
          published: target.published,
          tag: target.tag,
        },
        orderBy: {
          id: 'desc'
        }
      }),
      prisma.screenshot.findFirst({
        select: {
          id: true
        },
        where: {
          id: {
            gt: target.id
          },
          published: target.published,
          tag: target.tag
        },
        orderBy: {
          id: 'asc'
        }
      }),

    ])

    const { annotations, annotation, ...rest } = target

    res.status(200).send({
      next: next?.id ?? null,
      prev: prev?.id ?? null,
      data: {
      ...rest,
      image_data: Array.from(target.image_data!),
      annotations: annotation.map(a => ({
        id: a.id,
        label: a.label,
        rect: {
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height
        },
        text_content: a.text_content,
        clean: a.clean
      })) as Annotation[]
    }} as { data: Screenshot; next: number | null; prev: number | null }

  )
  } catch (e) {
    res.status(500)
      .send({ error: e})
  }
})


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
        text_content: a.text_content
      })) as Annotation[]
    }})
  } catch (err) {
    console.error(err)
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})




