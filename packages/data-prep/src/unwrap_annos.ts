// should only need one time.  Part of a data refactoring
import { PrismaClient } from '@prisma/client'
import { Annotation } from 'ui-labelling-shared'

main()

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

  for(const s of screens) {
    console.log('updating annotation json for screenshot: ', s.id)

    const maybeWrapped = s.annotations as unknown

    if (Array.isArray(maybeWrapped)) {
      console.log('annotations for this screen already ok: ', s.id)
      continue
    }

    const { annotations } = maybeWrapped as {
      annotations: Annotation[]
    }
    if (!Array.isArray(annotations)) {
      console.log('unexpected format: ', s.id)
      continue
    }

    // may as well clean this up while we are here
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


