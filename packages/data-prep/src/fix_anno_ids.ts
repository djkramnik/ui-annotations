// adaptation of write_interactive
// will we refactor this?  odds not looking good
import { PrismaClient } from '@prisma/client'
import { Annotation } from 'ui-labelling-shared'

main('service_manual')

async function main(tag: string) {
  const prisma = new PrismaClient()

  const screens = await prisma.screenshot.findMany({
    where: {
      image_data: {
        not: null
      },
      tag
    }
  })

  for(const s of screens) {
    console.log('updating annotation ids for screenshot: ', s.id)

    const annotations = s.annotations as unknown as Annotation[]

    if (!Array.isArray(annotations)) {
      console.log('missing annotations for screenshot: ', s.id)
      continue
    }

    const updatedAnnotations: Annotation[]
      =  annotations.map(a => {
        if (a.id.length === 36) {
          return a
        }
        return {...a, id: crypto.randomUUID() }
      })

    await prisma.screenshot.update({
      where: {
        id: s.id
      },
      data: {
        annotations: updatedAnnotations
      }
    })

  }
}


