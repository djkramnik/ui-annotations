import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { Annotation } from 'ui-labelling-shared';

export const annotationRouter = Router()

annotationRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const offset = (page - 1) * pageSize
  const tag = (req.query.tag as string) ?? null

  const [total, records] = await Promise.all([
    prisma.annotation.findMany({
      select: { id: true },
      where: {
        ...(tag ? {
          screenshot: {
            tag
          }
        } : {})
      }
    }),
    prisma.annotation.findMany({
      where: {
        ...(tag ? {
          screenshot: {
            tag
          }
        } : {})
      },
      orderBy: {
        id: 'asc'
      },
      take: pageSize,
      skip: offset
    })
  ])

  res.status(200).send({
    total: total.length,
    records
  })
})

annotationRouter.patch('/:id', async (req, res) => {
  const id = String(req.params.id)
  if (id.length !== 36) {
    res.status(400).send({
      reason: 'invalid id'
    })
    return
  }
  const body = req.body as {
    annotation: Pick<Annotation, 'rect' | 'label' | 'textContent'> & { clean?: boolean }
  }
  if (!body?.annotation) {
    res.status(400).send({
      reason: 'missing annotation in body'
    })
    return
  }
  const { annotation } = body
  try {
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
        text_content: annotation.textContent,
        clean: annotation.clean
      }
    })
  } catch(e) {
    res.status(500).send({ error: e })
  }
})

