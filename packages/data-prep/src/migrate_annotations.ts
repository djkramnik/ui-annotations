// should only need one time.  Part of a data refactoring
import { PrismaClient } from '@prisma/client'
import { Annotation } from 'ui-labelling-shared'

main()

type AnnotationRecord = {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  aspect_ratio: number
  screenshot_id: number
  text_content?: string
}

async function main() {
  const prisma = new PrismaClient()

  const screens = await prisma.screenshot.findMany({
    where: {
      image_data: {
        not: null
      },
    },
    select: {
      annotations: true,
      id: true
    }
  })
  console.log('this many screens', screens.length)


  let records: AnnotationRecord[] = []

  for(const s of screens) {
    console.log('updating annotation json for screenshot: ', s.id)

    const annotations = s.annotations as unknown as Annotation[]

    records.concat(
      annotations.map(a => ({
        id: a.id,
        label: a.label,
        x: a.rect.x,
        y: a.rect.y,
        width: a.rect.width,
        height: a.rect.height,
        aspect_ratio: Number((a.rect.width / a.rect.height).toFixed(2)),
        screenshot_id: s.id,
        text_content: a.textContent || undefined
      }))
    )
  }

  await prisma.annotation.createMany({
    data: records
  })
}


