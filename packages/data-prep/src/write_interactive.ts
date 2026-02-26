// query from annotations.. wherever the id isn't already in the ocr table.
// take every annotation from its payload with textRegion defined,
// crop out the bounding box into a standalone screenshot, and write that along with
// the actual text + other meta into ocr table

import { PrismaClient } from 'annotation_schema'
import sharp from 'sharp'
import { getRasterSize } from './utils/raster'
import { Annotation } from 'ui-labelling-shared'

type InteractiveRecord = {
  image_data: Buffer
  screenshot_id: number
  true_id: string
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
  const convertedScreens = new Set(
    (
      await prisma.interactive.findMany({
        where: {
          screenshot_id: {
            not: null,
          },
        },
      })
    ).map((a) => a.screenshot_id),
  ) as Set<number>

  console.log('converted screens length', convertedScreens.size)
  const unconvertedScreens = await prisma.screenshot.findMany({
    where: {
      id: {
        notIn: Array.from(convertedScreens),
      },
      tag: 'interactive',
    },
  })
  console.log('unconverted screens length', unconvertedScreens.length)

  let interactiveRecords: InteractiveRecord[] = []

  let badAnnotationIds = []
  for (const screen of unconvertedScreens) {
    const annotations = screen.annotations as Annotation[]
    if (!Array.isArray(annotations) || !screen.image_data) {
      console.log('skipping screen because empty data: ', screen.id)
      continue
    }
    const actualSize = getRasterSize(screen.image_data)
    if (actualSize === null) {
      console.warn('Could not get the raster size for this screen', screen.id)
      continue
    }

    for (const a of annotations) {
      if (a.label !== 'interactive' || typeof a.id !== 'string' || a.id.length !== 36) {
        if (a.id && a.label === 'interactive') {
          badAnnotationIds.push(a.id)
        }
        continue
      }
      const { image_data, view_width, view_height, id } = screen

      const sx = actualSize.width / view_width
      const sy = actualSize.height / view_height

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
        const clip = await sharp(image_data as Buffer)
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
          screenshot_id: id,
          image_data: clip,
          true_id: a.id
        })
      } catch (e) {
        console.error('wtf (sharp?)', e)
      }
    }
  }

  console.log('this many interactive records to write', interactiveRecords.length)
  console.log('this many bad boys', badAnnotationIds.length)
  console.log('sample hunk', badAnnotationIds[0])

  if (interactiveRecords.length > 0) {
    const { true_id, screenshot_id } = interactiveRecords[0]
    console.log('sample interactive..', {
      true_id,
      screenshot_id,
    })
  }

  await prisma.interactive.createMany({
    data: interactiveRecords
  })
}

main()
