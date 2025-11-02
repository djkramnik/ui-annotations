import { PrismaClient } from '@prisma/client'
import { Annotation, Rect, ServiceManualLabel } from 'ui-labelling-shared'

enum ServiceManualTextLabel {
  text_block =  ServiceManualLabel.text_block,
  heading = ServiceManualLabel.heading,
  bulletpoint = ServiceManualLabel.bulletpoint,

  caption = ServiceManualLabel.caption, // for an image / diagram
  image_id = ServiceManualLabel.image_id, // small non semantic ids attached to images in 2005 manual

  diagram_number = ServiceManualLabel.diagram_number, // a number appearing on the diagram w/wo a line
  diagram_label = ServiceManualLabel.diagram_label, // a string label appearing on the diagram w/wo a line

  section_number = ServiceManualLabel.section_number, // a big number prob
  page_num = ServiceManualLabel.page_num, // the actual page number if it appears

  toc_entry = ServiceManualLabel.toc_entry,
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

  const screens = await prisma.screenshot.findMany({
    where: {
      tag,
      published: published ? 1 : 0,
    },
  })
  console.log('# screens to ocr: ', screens.length)

  for (const screen of screens) {
    const annotations = screen.annotations as Annotation[]
    if (!Array.isArray(annotations) || !screen.image_data) {
      console.log('skipping screen cause empty payload: ', screen.id)
      continue
    }

    const requiresOcr = annotations.filter(a =>
      labels.includes(a.label as ServiceManualTextLabel) && (!a.textContent || overwrite)
    )
    if (requiresOcr.length === 0) {
      console.log('skipping screen cause it dont need nothin from nobody: ', screen.id)
      continue
    }

    // run text_predict yolo...
    // get boxes
    const fullScreen= Buffer.from(screen.image_data).toString('base64')

    const textRegionsResp = await fetch('http://localhost:8000/predict_textregions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: fullScreen, conf: 0.1, imgsz: 1024 }),
    })

    const { detections } =
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
      'http://localhost:4000/api/util/clips',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noScale: true,
          rects: detectionZones.map(d => d.rect),
          vw: -1,
          vh: -1,
          fullScreen: Buffer.from(screen.image_data).toString('base64'),
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

    const annotationsWithOcr = annotations.map(a => {
      const skip =
        (a.textContent && !overwrite) || !labels.includes(a.label as ServiceManualTextLabel)
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

    await prisma.screenshot.update({
      where: {
        id: screen.id
      },
      data: {
        annotations: annotationsWithOcr
      }
    })
  }
}

// TODO: dry this up
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