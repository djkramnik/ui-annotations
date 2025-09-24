// query from annotations.. wherever the id isn't already in the ocr table.
// take every annotation from its payload with textRegion defined,
// crop out the bounding box into a standalone screenshot, and write that along with
// the actual text + other meta into ocr table

import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { getRasterSize } from './utils/raster'

// the type of the annotation jsonb
type Payload = {
  annotations?: Array<{
    id: string
    rect: { x: number; y: number; width: number; height: number }
    label: string
    textContent?: string
  }>
}

type InteractiveRecord = {
  screenshot: Buffer
  annotationId: number
  trueId: string
}

function getClamp(min: number, max: number) {
  if (min >= max) {
    throw Error('invalid clamp factory args')
  }
  return function clamp(n: number) {
    return Math.floor(Math.min(Math.max(n, min), max))
  }
}

async function main() {
  const prisma = new PrismaClient()

  // find annotations that are not linked to any existing interactive record
  // this uses separate queries unoptimally but that is fine for now
  const convertedAnnos = new Set(
    (
      await prisma.interactive.findMany({
        where: {
          annotationId: {
            not: null,
          },
        },
      })
    ).map((a) => a.annotationId),
  ) as Set<number>

  console.log('converted annos length', convertedAnnos.size)
  const unconvertedAnnos = await prisma.annotation.findMany({
    where: {
      id: {
        notIn: Array.from(convertedAnnos),
      },
      tag: 'interactive',
    },
  })
  console.log('unconverted annos length', unconvertedAnnos.length)

  let interactiveRecords: InteractiveRecord[] = []

  for (const anno of unconvertedAnnos) {
    const payload = anno.payload as Payload
    if (!payload.annotations || !anno.screenshot) {
      console.log('skipping annotation because empty payload: ', anno.id)
      continue
    }
    const actualSize = getRasterSize(anno.screenshot)
    if (actualSize === null) {
      console.warn('Could not get the raster size for this anno', anno.id)
      continue
    }

    for (const a of payload.annotations) {
      if (a.label !== 'interactive' || typeof a.id !== 'string') {
        continue
      }
      const { screenshot, viewWidth, viewHeight, id } = anno

      const sx = actualSize.width / viewWidth
      const sy = actualSize.height / viewHeight

      const scaledRoundedRect = {
        x: Math.round(a.rect.x * sx),
        y: Math.round(a.rect.y * sy),
        width: Math.round(a.rect.width * sx),
        height: Math.round(a.rect.height * sy),
      }

      const left = getClamp(0, actualSize.width - 1)(scaledRoundedRect.x)
      const top = getClamp(0, actualSize.height - 1)(scaledRoundedRect.y)
      const width = getClamp(
        1,
        actualSize.width - left,
      )(scaledRoundedRect.width)
      const height = getClamp(
        1,
        actualSize.height - 1,
      )(scaledRoundedRect.height)

      try {
        const clip = await sharp(screenshot as Buffer)
          .rotate() // keep consistent with metadata
          .extract({
            left,
            top,
            width,
            height,
          })
          .toFormat('png')
          .toBuffer()
        interactiveRecords.push({
          annotationId: id,
          screenshot: clip,
          trueId: a.id
        })
      } catch (e) {
        console.error('wtf (sharp?)', e)
      }
    }
  }

  console.log('this many interactive records to write', interactiveRecords.length)
  if (interactiveRecords.length > 0) {
    const { trueId, annotationId } = interactiveRecords[0]
    console.log('sample interactive..', {
      trueId,
      annotationId,
    })
  }

  await prisma.interactive.createMany({
    data: interactiveRecords.map((r) => ({
      screenshot: r.screenshot,
      trueId: r.trueId,
      annotationId: r.annotationId,
    })),
  })
}

main()
