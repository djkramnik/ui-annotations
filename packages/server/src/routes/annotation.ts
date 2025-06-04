import { Router, Request, Response } from 'express'
import { getDb } from '../db'

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
      screenshot,
      window
    } = req.body as AnnotationPayload

    const db = getDb()

    const { rows } = await db.raw(
      `INSERT into annotations (scrolly, url, payload, screenshot) values (?, ?, ?::jsonb, decode(?, 'base64')) RETURNING *`,
      [
        window.scrollY,
        url,
        JSON.stringify({
          annotations,
          date,
          window,
        }),
        screenshot,
      ]
    )

    res.status(200).send({ data: rows[0].id })
  } catch(err) {
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

annotationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDb()
    const { rows } = await db.raw(
      `SELECT id, url from annotations order by id asc`
    )
    res.status(200).send({ data: rows })
  } catch(err) {
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})

annotationRouter.get('/:id', async (req: Request, res: Response) => {
  const annotationId = Number(req.params.id)
  try {
    const db = getDb()
    const { rows } = await db.raw(
      `SELECT id, url, payload, screenshot
      from annotations where id = ?`,
      [annotationId]
    )
    if (rows.length < 1) {
      res.status(404).send({ message: 'Could not find annotation with id ' + annotationId })
      return
    }
    res.status(200).send({ data: rows[0] })
  } catch(err) {
    res.status(500).send({ message: 'Unexpected error ' + err })
  }
})
