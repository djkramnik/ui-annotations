import { Router, Request, Response } from 'express'
import { prisma } from '../db'
import { InteractiveLabel } from 'ui-labelling-shared'

export const interactiveRouter = Router()

type BatchUpdate = {
  id: number
  label: string | null
}

type BatchUnrolled = {
  ids: number[]
  labels: (string | null)[]
}

interactiveRouter.delete('/:id', async (req: Request, res: Response) => {
  const interactiveId = Number(String(req.params.id))
  if (Number.isNaN(interactiveId)) {
    res.status(400).send({ reason: 'invalid id'})
    return
  }
  try {
    await prisma.interactive.delete({
      where: {
        id: interactiveId
      },
    })
    res.status(200).send({ id: interactiveId })
  } catch (e) {
    console.error('Failed to delete interactive record')
    res.status(500).send({ error: String(e) })
  }
})

interactiveRouter.put('/batch-update', async (req: Request, res: Response) => {
  const body = req.body as {
    updates: BatchUpdate
  }
  if (!Array.isArray(body?.updates)) {
    res.status(400).send({
      reason: 'no updates array field'
    })
    return
  }
  try {
    const { ids, labels } = Object.values(body.updates)
      .reduce((acc: BatchUnrolled, item) => {
        return {
          ids: acc.ids.concat(item.id),
          labels: acc.labels.concat(item.label),
        }
      }, {ids:[], labels: []})

    await prisma.$executeRawUnsafe(`
      WITH data(id, val) AS (
        SELECT * FROM UNNEST($1::int[], $2::text[])
      )
      UPDATE interactive i
      SET label = d.val
      FROM data d
      WHERE i.id = d.id
      `,
      ids,
      labels
    )

    res.status(200).send({ updated: ids.length })
  } catch(e) {
    console.error('Failed to batch update interactive records')
    res.status(500).send({ error: String(e) })
  }
})

interactiveRouter.patch('/:id', async (req: Request, res: Response) => {
  const interactiveId = Number(String(req.params.id))
  if (Number.isNaN(interactiveId)) {
    res.status(400).send({ reason: 'invalid id'})
    return
  }
  try {
    const body = req.body as { label: string }
    if (!body?.label || typeof body.label !== 'string') {
      res.status(400).send({ reason: 'string label field equired in request body' })
      return
    }
    await prisma.interactive.update({
      where: {
        id: interactiveId
      },
      data: {
        label: body.label
      }
    })
    res.status(200).send({ id: interactiveId })
  } catch (e) {
    console.error('Failed to update interactive record')
    res.status(500).send({ error: String(e) })
  }
})

interactiveRouter.get('/analytics', async (req: Request, res: Response) => {
  const labelCounts = await prisma.$queryRaw<{
    label: string
    count: bigint,
  }[]>` select label, count(*) from interactive group by label order by 1 desc`

  const sanctionedLabels = Object.values(InteractiveLabel)
  const sanctionedData: {label: string; count: number}[]
    = sanctionedLabels.map(label => {
      return {
        label,
        count: Number(labelCounts.find(i => i.label === label)?.count ?? 0)
      }
    })

  res.status(200).send({
    labelCounts: sanctionedData
  })
})

// get single
interactiveRouter.get('/:id', async (req: Request, res: Response) => {
  const interactiveId = Number(String(req.params.id))
  if (Number.isNaN(interactiveId)) {
    res.status(400).send()
    return
  }

  try {
    const result = await prisma.interactive.findFirstOrThrow({
      where: {
        id: interactiveId
      }
    })
    res.status(200).send({
      screenshot: Array.from(result.image_data),
      label: result.label
    })
  } catch(e) {
    res.status(500).send({
      error: String(e)
    })
  }
})

// paginated findMany
interactiveRouter.get('/', async (req: Request, res: Response) => {
  try {
    const label = typeof req.query.label === 'string'
      ? req.query.label
      : undefined
    const pageQ = typeof req.query.page === 'string'
      ? req.query.page
      : '0'
    const pageSizeQ = typeof req.query.pageSize === 'string'
      ? req.query.pageSize
      : '20'
    const synth = typeof req.query.synth === 'string'
      ? req.query.synth
      : undefined

    const page = Math.floor(Number(pageQ))
    const pageSize= Math.min(Math.floor(Number(pageSizeQ)), 50)
    const unlabelledOnly = req.query.unlabelled === 'true'

    if (Number.isNaN(page) || page < 0) {
      res.status(400).send({
        reason: 'bad page query param. Single non negative integer only'
      })
      return
    }
    if (Number.isNaN(pageSize) || pageSize <= 0) {
      res.status(400).send({
        reason: 'bad pageSize query param. Single positive integer only'
      })
      return
    }

    const synthWhereClause = { screenshot_id: { equals: null }}

    // just the where clause needs to be conditional
    // but prisma types too complicated for me
    const findTask = unlabelledOnly && !label
      ? (
        prisma.interactive.findMany({
          where: {
            label: { equals: null },
            ...(synth === 'true' ? synthWhereClause : {})
          },
          orderBy: { id: 'desc' },
          skip:  page * pageSize, // page is 0 based index,
          take: pageSize
        })
      )
      : (
        prisma.interactive.findMany({
          where: {
            ...(label ? { label } : {}),
            ...(synth === 'true' ? synthWhereClause : {})
          },
          orderBy: { id: 'desc' },
          skip:  page * pageSize, // page is 0 based index,
          take: pageSize
        })
      )

    const countTask =
      unlabelledOnly && !label
        ? (
          prisma.interactive.count({
            where: {
              label: { equals: null },
              ...(synth === 'true' ? synthWhereClause : {})
            },
          })
        )
        : (
          prisma.interactive.count({
            where: {
              ...(label ? { label } : {}),
              ...(synth === 'true' ? synthWhereClause : {})
            },
          })
        )

    const [total, items] = await Promise.all([
      countTask,
      findTask,
    ])

    res.status(200).send({
      items: items.map(i => ({
        ...i,
        screenshot: Array.from(i.image_data)
      })),
      total,
    })

  } catch(e) {
    console.error('error fetching interactive records', e)
    res.status(500).send({
      error: String(e)
    })
  }
})