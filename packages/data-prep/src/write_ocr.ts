// query from annotations.. wherever the id isn't already in the ocr table.
// take every annotation from its payload with textRegion defined,
// crop out the bounding box into a standalone screenshot, and write that along with
// the actual text + other meta into ocr table

import { PrismaClient } from "@prisma/client";
import sharp from 'sharp'
import { getRasterSize } from "./utils/raster";

// the type of the annotation jsonb
type Payload = {
  annotations?: Array<{
    id: string;
    rect: { x: number; y: number; width: number; height: number };
    label: string;
    textContent?: string
  }>;
};

type OcrRecord = {
  rect: { x: number; y: number; width: number; height: number }
  screenshot: Buffer
  annotationId: number
  textContent: string
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
  const prisma = new PrismaClient();
  const convertedAnnos = new Set((await prisma.ocr.findMany({}))
    .map(a => a.id))
  console.log('converted annos length', convertedAnnos.size)
  const unconvertedAnnos = await prisma.annotation.findMany({
    where: {
      id: {
        notIn: Array.from(convertedAnnos)
      },
      tag: 'ocr'
    }
  })
  console.log('unconverted annos length', unconvertedAnnos.length)

  let ocrRecords: OcrRecord[] = []

  for (const anno of unconvertedAnnos) {
    const payload = anno.payload as Payload
    if (!payload.annotations || !anno.screenshot) {
      console.log('skipping annotation cause empty payload: ', anno.id)
      continue
    }
    const actualSize = getRasterSize(anno.screenshot)
    if (actualSize === null) {
      console.warn('Could not get the raster size for this anno', anno.id)
      continue
    }

    for (const a of payload.annotations) {
      if (a.label !== 'textRegion' || !a.textContent) {
        continue
      }
      const {
        screenshot,
        viewWidth,
        viewHeight,
        id
      } = anno

      const sx = actualSize.width / viewWidth
      const sy = actualSize.height / viewHeight

      const scaledRoundedRect = {
        x: Math.round(a.rect.x * sx),
        y: Math.round(a.rect.y * sy),
        width: Math.round(a.rect.width * sx),
        height: Math.round(a.rect.height * sy)
      }

      const left = getClamp(0, actualSize.width - 1)(scaledRoundedRect.x)
      const top = getClamp(0, actualSize.height - 1)(scaledRoundedRect.y)
      const width = getClamp(1, actualSize.width - left)(scaledRoundedRect.width)
      const height = getClamp(1, actualSize.height - 1)(scaledRoundedRect.height)

      try {
        const clip = await (sharp(screenshot as Buffer)
          .rotate() // keep consistent with metadata
          .extract({
            left,
            top,
            width,
            height,
        }).toFormat('png')).toBuffer()
        ocrRecords.push({
          rect: a.rect,
          annotationId: id,
          screenshot: clip,
          textContent: a.textContent
        })
      } catch (e) {
        console.error('wtf (sharp?)', e)
      }
    }
  }

  console.log('this many ocr records to write', ocrRecords.length)
  if (ocrRecords.length > 0) {
    const { textContent, annotationId } = ocrRecords[0]
    console.log('sample ocr..', {
      text: textContent,
      annotationId,
    })
  }

  await prisma.ocr.createMany({
    data: ocrRecords.map(r => ({
      screenshot: r.screenshot,
      text: r.textContent,
      date: new Date().toISOString(),
      annotationId: r.annotationId
    }))
  })
}

main()
