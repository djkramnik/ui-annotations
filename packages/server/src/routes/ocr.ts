import { Router, Request, Response } from 'express'
import { prisma } from '../db'

export const ocrRouter = Router()

ocrRouter.get('/:id', async (req: Request, res: Response) => {
  const ocrId = Number(req.params.id)
  if (Number.isNaN(ocrId)) {
    res.status(400).send()
    return
  }

  try {
    const result = await prisma.ocr.findFirstOrThrow({
      where: {
        id: ocrId
      }
    })
    res.status(200).send({
      screenshot: Array.from(result.screenshot),
      text: result.text
    })
  } catch(e) {
    res.status(500).send({
      error: String(e)
    })
  }
})