// adaptation of write_interactive
// will we refactor this?  odds not looking good
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { getRasterSize } from './utils/raster'


const tag: string = process.argv[2] ?? 'service_manual'

const _labelArg = process.argv[3]

const labels: string[] = typeof _labelArg === 'string'
  ? _labelArg.split(',')
  : ['diagram', 'image']

main(tag, labels)

// the type of the annotation jsonb
type Payload = {
  annotations?: Array<{
    id: string
    rect: { x: number; y: number; width: number; height: number }
    label: string
    textContent?: string
  }>
}

type ImageCropRecord = {
  screenshot: Buffer
  annotationId: number
  trueId: string
  aspectRatio: number
  ogWidth: number
}

function getClamp(min: number, max: number) {
  if (min >= max) {
    throw Error('invalid clamp factory args')
  }
  return function clamp(n: number) {
    return Math.floor(Math.min(Math.max(n, min), max))
  }
}

async function main(tag: string, labels: string[]) {
  console.log('writing image crops for tag: ', tag, ' labels: ', labels.join(','))
  const prisma = new PrismaClient()

  // find annotations that are not linked to any existing interactive record
  // this uses separate queries unoptimally but that is fine for now
  const convertedAnnos = new Set(
    (
      await prisma.imageCrop.findMany({
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
      tag,
    },
  })
  console.log('unconverted annos length', unconvertedAnnos.length)

  let crops: ImageCropRecord[] = []

  let badAnnotationIds = []
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
      if (a.id?.length !== 36) {
        badAnnotationIds.push(a.id ?? 'none')
        continue
      }
      if (!labels.includes(a.label)) {
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
        crops.push({
          annotationId: id,
          screenshot: clip,
          trueId: a.id,
          ogWidth: Math.round(scaledRoundedRect.width),
          aspectRatio: Number((scaledRoundedRect.width / scaledRoundedRect.height).toFixed(2))
        })
      } catch (e) {
        console.error('wtf (sharp?)', e)
      }
    }
  }

  console.log('this many interactive records to write', crops.length)
  console.log('this many bad boys', badAnnotationIds.length)
  console.log('sample hunk', badAnnotationIds[0])

  await prisma.imageCrop.createMany({
    data: crops.map((c) => ({
      screenshot: c.screenshot,
      true_id: c.trueId,
      annotationId: c.annotationId,
      aspectRatio: c.aspectRatio,
      ogWidth: c.ogWidth
    })),
  })
}


