import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { Annotation } from 'ui-labelling-shared';

export const annotationRouter = Router()

annotationRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const published = req.query.published as string !== 'false'
  const offset = (page - 1) * pageSize
  const tag = (req.query.tag as string) ?? null
  console.log(page, pageSize, published, offset, tag)
  const [total, records] = await Promise.all([
    prisma.annotation.findMany({
      select: { id: true },
      where: {
        clean: { not: true },
        screenshot: {
          image_data: {
            not: null
          },
          ...(tag ? {
            tag
          }: undefined),
          ...(published ? {
            published: 1
          }: undefined)
        },
      }
    }),
    prisma.annotation.findMany({
      where: {
        clean: { not: true },
        screenshot: {
          image_data: {
            not: null
          },
          ...(tag ? {
            tag
          }: undefined),
          ...(published ? {
            published: 1
          }: undefined)
        },
      },
      orderBy: [{
        screenshot_id: 'asc',
      }, {
        id: 'asc'
      }],
      take: pageSize,
      skip: offset,
      include: {
        screenshot: {
          select: {
            image_data: true,
            id: true,
            view_height: true,
            view_width: true,
          }
        }
      }
    })
  ])

  res.status(200).send({
    total: total.length,
    records: records.map(r => ({
      ...r,
      rect: {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height
      },
      screenshot: {
        ...r.screenshot,
        image_data: Array.from(r.screenshot.image_data!)
      }
    }))
  })
})

annotationRouter.patch('/:id', async (req, res) => {
  const id = String(req.params.id)
  console.log('how agbout here', id)
  if (id.length !== 36) {
    res.status(400).send({
      reason: 'invalid id'
    })
    return
  }
  const body = req.body as {
    annotation: Pick<Annotation, 'rect' | 'label' | 'text_content'> & { clean?: boolean }
  }
  if (!body?.annotation) {
    res.status(400).send({
      reason: 'missing annotation in body'
    })
    return
  }
  const { annotation } = body
  try {
    console.log('here?', annotation)
    await prisma.annotation.update({
      where: {
        id,
      },
      data: {
        x: annotation.rect.x,
        y: annotation.rect.y,
        width: annotation.rect.width,
        height: annotation.rect.height,
        aspect_ratio: Number((annotation.rect.width / annotation.rect.height).toFixed(2)),
        text_content: annotation.text_content,
        clean: annotation.clean,
        label: annotation.label
      }
    })
    res.status(200).send({
      x: annotation.rect.x,
      y: annotation.rect.y,
      width: annotation.rect.width,
      height: annotation.rect.height,
      aspect_ratio: Number((annotation.rect.width / annotation.rect.height).toFixed(2)),
      text_content: annotation.text_content,
      clean: annotation.clean,
      label: annotation.label
    })
  } catch(e) {
    console.error(e)
    res.status(500).send({ error: e })
  }
})

annotationRouter.delete('/:id', async (req, res) => {
  const id = String(req.params.id)
  if (id.length !== 36) {
    res.status(400).send({
      reason: 'invalid id'
    })
    return
  }
  try {
    await prisma.annotation.delete({
      where: {
        id
      }
    })
    res.status(200).send({
      id
    })
  } catch(e) {
    res.status(500).send({ error: e })
  }
})

