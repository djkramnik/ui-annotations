// adaptation of write_interactive
// will we refactor this?  odds not looking good
import { PrismaClient } from '@prisma/client'

main('service_manual')

type Annotations = {
  annotations: { id: string }[]
}

async function main(tag: string) {
  const prisma = new PrismaClient()

  const annos = await prisma.annotation.findMany({
    where: {
      screenshot: {
        not: null
      },
      tag
    }
  })

  for(const a of annos) {
    console.log('updating: ', a.id)
    const payload = a.payload as unknown as Annotations
    if (!Array.isArray(payload?.annotations)) {
      console.log('missing payload', a.id)
      continue
    }

    const newPayload = {
      annotations: payload.annotations.map(a => {
        if (a.id.length === 36) {
          return a
        }
        return {...a, id: crypto.randomUUID() }
      })
    }

    await prisma.annotation.update({
      where: {
        id: a.id
      },
      data: {
        payload: newPayload
      }
    })

  }
}


