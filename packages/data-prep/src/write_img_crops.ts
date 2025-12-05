// adaptation of write_interactive
// will we refactor this?  odds not looking good
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'
import { getRasterSize } from './utils/raster'
import { Annotation } from 'ui-labelling-shared'


const tag: string = process.argv[2] ?? 'service_manual'

const _labelArg = process.argv[3]

const labels: string[] = typeof _labelArg === 'string'
  ? _labelArg.split(',')
  : ['qrcode', 'barcode']

main(tag, labels)

type ImageCropRecord = {
  image_data: Buffer
  screenshot_id: number
  true_id: string
  aspect_ratio: number
  og_width: number
  og_label: string
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


  const screens = await prisma.screenshot.findMany({
    where: {
      tag,
    },
    include: {
      annotation: true
    }
  })
  // prevent dups
  const existingAnnoIds = (await prisma.image_crop.findMany({
    select: {
      true_id: true
    }
  })).reduce((acc, item) => {
    if (!item.true_id) {
      return acc
    }
    return acc.concat(item.true_id)
  }, [] as string[])

  let crops: ImageCropRecord[] = []

  let badAnnotationIds = []
  for (const screen of screens) {
    const annotations = screen.annotation
      .map(a => ({
        ...a,
        rect: {
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height
        }
      })) as Annotation[]
    if (!Array.isArray(annotations) || !screen.image_data) {
      console.log('skipping screen because empty annotations: ', screen.id)
      continue
    }
    const actualSize = getRasterSize(screen.image_data)
    if (actualSize === null) {
      console.warn('Could not get the raster size for this screen', screen.id)
      continue
    }

    for (const a of annotations) {
      if (a.id?.length !== 36) {
        badAnnotationIds.push(a.id ?? 'none')
        continue
      }
      if (existingAnnoIds.includes(a.id)) {
        continue
      }
      if (!labels.includes(a.label)) {
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
        crops.push({
          screenshot_id: id,
          image_data: clip,
          true_id: a.id,
          og_width: Math.round(scaledRoundedRect.width),
          aspect_ratio: Number((scaledRoundedRect.width / scaledRoundedRect.height).toFixed(2)),
          og_label: a.label
        })
      } catch (e) {
        console.error('wtf (sharp?)', e)
      }
    }
  }

  console.log('this many img crops to write', crops.length)
  console.log('this many bad boys', badAnnotationIds.length)
  console.log('sample hunk', badAnnotationIds[0])

  await prisma.image_crop.createMany({
    data: crops,
  })
}


