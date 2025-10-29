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

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

// the type of the annotation jsonb
type Payload = {
  annotations?: Array<{
    id: string
    rect: Rect
    label: string
    textContent?: string
  }>
}

type YoloPredictResponse = {
  width: number
  height: number
  detections: {
    box: [number, number, number, number], // x1,y1,x2,y2
    conf: number
    label: string
    text?: string
  }[]
}

const tag: string = process.argv[2] ?? 'service_manual'

const _labelArg = process.argv[3]

const labels: string[] =
  typeof _labelArg === 'string'
    ? _labelArg.split(',')
    : Object.values(ServiceManualTextLabel)


main({
  tag,
  labels,
  overwrite: true
})

async function main({
  tag,
  labels,
  published = true,
  overwrite = false,
}: {
  tag: string
  labels: string[]
  published?: boolean
  overwrite?: boolean
}) {
  const prisma = new PrismaClient()

  const annos = await prisma.annotation.findMany({
    where: {
      tag,
      published: published ? 1 : 0,
      id: 1420
    },
  })
  console.log('annos length', annos.length)

  for (const anno of annos) {
    const payload = anno.payload as Payload
    if (!payload.annotations || !anno.screenshot) {
      console.log('skipping annotation cause empty payload: ', anno.id)
      continue
    }

    // run text_predict yolo...
    // get boxes
    const fullScreen= Buffer.from(anno.screenshot).toString('base64')

    const textRegionsResp = await fetch('http://localhost:8000/predict_textregions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: fullScreen, conf: 0.1, imgsz: 1024 }),
    })

    const { detections, width, height } =
      (await textRegionsResp.json()) as YoloPredictResponse


    let detectionZones: {
      rect: Rect,
      textContent?: string
    }[] = detections.map((d) => {
      const [x1, y1, x2, y2] = d.box
      return {
        rect: {
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
        }
      }
    }).sort((a, b) => {
      return a.rect.y - b.rect.y || a.rect.x - b.rect.x
    }) // important.. sort from top to bottom.  need to keep the ordering on this across variants as well

    const clipsResp = await fetch(
      'http://localhost:4000/api/screenshot/clips',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noScale: true,
          rects: detectionZones.map(d => d.rect),
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

    // we have bounding boxes plus their accompanying text
    //
    detectionZones = detectionZones.map((d, i) => ({
      ...d,
      textContent: results[i].text
    }))
    const detectionBoxes = detectionZones.map(d => d.rect)

    console.log('ocr results', detectionZones.map(d => d.textContent))

    const payloadWithOcr = payload.annotations.map(a => {
      const skip =
        (a.textContent && !overwrite) || !Object.values(ServiceManualTextLabel).includes(a.label as ServiceManualTextLabel)
      if (skip) {
        return a
      }
      const textChunksInAnnotation =
        withinRect(
          a.rect,
          detectionBoxes,
          5, // tolerance for being outside
        )
      const constructedText =
        detectionZones.reduce((acc: string, dz, i) => {
          if (textChunksInAnnotation.includes(i)) {
            return acc.concat(dz.textContent || '') + '\n' // must add in newlines bruh
          }
          return acc
        }, '').replace(/\n$/, '') // must replace trailing newline bruh
      return {
        ...a,
        textContent: constructedText
      }
    })

    await prisma.annotation.update({
      where: {
        id: anno.id
      },
      data: {
        payload: {
          annotations: payloadWithOcr
        }
      }
    })

  }
}

function withinRect(
  target: Rect,
  components: Rect[],
  threshold = 10 // px tolerance
): number[] {
  const left = target.x - threshold;
  const right = target.x + target.width + threshold;
  const top = target.y - threshold;
  const bottom = target.y + target.height + threshold;

  return components
    .map((r, i) => {
      const inside =
        r.x >= left &&
        r.x + r.width <= right &&
        r.y >= top &&
        r.y + r.height <= bottom;
      return inside ? i : -1;
    })
    .filter(i => i !== -1);
}