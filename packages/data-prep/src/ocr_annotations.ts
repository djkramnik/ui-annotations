import { PrismaClient } from '@prisma/client'

enum ServiceManualTextLabel {
  text_block = 'text_block',
  heading = 'heading',
  bulletpoint = 'bulletpoint',

  caption = 'caption', // for an image / diagram
  image_id = 'image_id', // small non semantic ids attached to images in 2005 manual

  diagram_number = 'diagram_number', // a number appearing on the diagram w/wo a line
  diagram_label = 'diagram_label', // a string label appearing on the diagram w/wo a line

  section_number = 'section_number', // a big number prob
  page_num = 'page_num', // the actual page number if it appears

  toc_entry = 'toc_entry',
}

// the type of the annotation jsonb
type Payload = {
  annotations?: Array<{
    id: string
    rect: { x: number; y: number; width: number; height: number }
    label: string
    textContent?: string
  }>
}

type OcrRecord = {
  rect: { x: number; y: number; width: number; height: number }
  screenshot: Buffer
  annotationId: number
  textContent: string
}

const tag: string = process.argv[2] ?? 'service_manual'

const _labelArg = process.argv[3]

const labels: string[] =
  typeof _labelArg === 'string'
    ? _labelArg.split(',')
    : Object.values(ServiceManualTextLabel)

main(tag, labels)

async function main(tag: string, labels: string[], published = true) {
  const prisma = new PrismaClient()

  const annos = await prisma.annotation.findMany({
    where: {
      tag,
      published: published ? 1 : 0,
    },
  })
  console.log('annos length', annos.length)

  for (const anno of annos) {
    const payload = anno.payload as Payload
    if (!payload.annotations || !anno.screenshot) {
      console.log('skipping annotation cause empty payload: ', anno.id)
      continue
    }

    const requiresOcr = payload.annotations.filter(
      (a) => labels.includes(a.label) && !a.textContent,
    )

    const clipsResp = await fetch(
      'http://localhost:4000/api/screenshot/clips',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noScale: true,
          rects: requiresOcr.map((a) => a.rect),
          vw: -1,
          vh: -1,
          fullScreen: Buffer.from(anno.screenshot).toString('base64'),
        }),
      },
    )

    const { clips } = (await clipsResp.json()) as { clips: string[] }

    const ocrResp = await fetch('http://localhost:8000/ocr/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clips,
      }),
    })

    const { results } = (await ocrResp.json()) as {
      results: Array<{text: string; score: number}>
    }

    const payloadWithOcr = payload.annotations.map(a => {
      const idx = requiresOcr.indexOf(a)
      if (idx === -1) {
        return a // noop
      }

      const { text, score } = results[idx]
      // optionally can gate on score here
      return {
        ...a,
        textContent: text
      }
    })

    await prisma.annotation.update({
      where: {
        id: anno.id
      },
      data: {
        payload: payloadWithOcr
      }
    })

  }
}
