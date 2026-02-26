// adaptation of write_interactive
// will we refactor this?  odds not looking good
import { PrismaClient } from 'annotation_schema'
import sharp from 'sharp'
import { getRasterSize } from './utils/raster'
import { Annotation } from 'ui-labelling-shared'

;(async function prep(): Promise<[string, string[]]> {
  const tag = process.argv[2]
  if (!tag) {
    throw Error('tag not supplied in script args')
  }
  const prisma = new PrismaClient()
  const labels = (await prisma.tag_label.findMany({
    select: { label: true},
    where: {
      tag
    }
  })).map(({ label }) => label)
  if (!labels || !labels.length) {
    throw Error('no labels found for tag ' + tag)
  }
  return [tag, labels]
})()
.then(([tag, labels]) => {
  return main(tag, labels)
}).then(() => {
  process.exit(0)
}).catch((e) => {
  console.error('error with img_crop script', e)
})

const tag: string = process.argv[2] ?? 'service_manual'

const _labelArg = process.argv[3]

const labels: string[] = typeof _labelArg === 'string'
  ? _labelArg.split(',')
  : ['qr_code', 'barcode']

type InteractiveRecord = {
  image_data: Buffer
  screenshot_id: number
  true_id: string
  label: string
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
    select: {
      id: true
    }
  })

  let crops: InteractiveRecord[] = []

  let badAnnotationIds = []
  for (const screen of screens) {
    const [rawAnnotations, currScreen] = await Promise.all([
      prisma.annotation.findMany({
        where: {
          screenshot_id: screen.id
        }
      }),
      prisma.screenshot.findFirst({
        where: {
          id: screen.id
        },
        select: {
          image_data: true,
          view_height: true,
          view_width: true
        }
      })
    ])
    const image_data = currScreen?.image_data

    const annotations = rawAnnotations
      .map(a => ({
        ...a,
        rect: {
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height
        }
      })) as Annotation[]
    if (!Array.isArray(annotations) || !image_data) {
      console.log('skipping screen because empty annotations or image_data: ', screen.id)
      continue
    }
    const actualSize = getRasterSize(image_data)
    if (actualSize === null) {
      console.warn('Could not get the raster size for this screen', screen.id)
      continue
    }

    for (const a of annotations) {
      if (a.id?.length !== 36) {
        badAnnotationIds.push(a.id ?? 'none')
        continue
      }
      if (!labels.includes(a.label)) {
        continue
      }

      const { image_data, view_width, view_height } = currScreen

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
          screenshot_id: screen.id,
          image_data: clip,
          true_id: a.id,
          label: a.label,
        })
      } catch (e) {
        console.error('wtf (sharp?)', e)
      }
    }
  }

  console.log('this many img crops to write', crops.length)
  console.log('this many bad boys', badAnnotationIds.length)
  console.log('sample hunk', badAnnotationIds[0])

  await prisma.interactive.createMany({
    data: crops,
  })
}


