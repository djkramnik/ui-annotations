// query from annotations.. wherever the id isn't already in the ocr table.
// take every annotation from its payload with textRegion defined,
// crop out the bounding box into a standalone screenshot, and write that along with
// the actual text + other meta into ocr table

import { PrismaClient } from "@prisma/client";
import sharp from 'sharp'
import { getRasterSize } from "./utils/raster";
import { Annotation, Rect } from "ui-labelling-shared";

type OcrRecord = {
  rect: Rect
  image_data: Buffer
  screenshot_id: number
  text: string
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
  const convertedScreens = new Set((await prisma.ocr.findMany({}))
    .map(a => a.screenshot_id)
    .filter(id => id)) as Set<number>

  console.log('converted screens length', convertedScreens.size)
  const unconvertedScreens = await prisma.screenshot.findMany({
    where: {
      id: {
        notIn: Array.from(convertedScreens)
      },
      tag: 'ocr'
    }
  })
  console.log('unconverted screens length', unconvertedScreens.length)

  let ocrRecords: OcrRecord[] = []

  for (const screen of unconvertedScreens) {
    const annotations = screen.annotations as Annotation[]
    if (!Array.isArray(annotations) || !screen.image_data) {
      console.log('skipping screen cause empty data: ', screen.id)
      continue
    }
    const actualSize = getRasterSize(screen.image_data)
    if (actualSize === null) {
      console.warn('Could not get the raster size for this screen', screen.id)
      continue
    }

    for (const a of annotations) {
      if (a.label !== 'textRegion' || !a.text_content) {
        continue
      }
      const {
        image_data,
        view_width,
        view_height,
        id
      } = screen

      const sx = actualSize.width / view_width
      const sy = actualSize.height / view_height

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
        const clip = await (sharp(image_data as Buffer)
          .rotate() // keep consistent with metadata
          .extract({
            left,
            top,
            width,
            height,
        }).toFormat('png')).toBuffer()
        ocrRecords.push({
          rect: a.rect,
          screenshot_id: id,
          image_data: clip,
          text: a.text_content
        })
      } catch (e) {
        console.error('wtf (sharp?)', e)
      }
    }
  }

  console.log('this many ocr records to write', ocrRecords.length)
  if (ocrRecords.length > 0) {
    const { text, screenshot_id } = ocrRecords[0]
    console.log('sample ocr..', {
      text,
      screenshot_id,
    })
  }

  await prisma.ocr.createMany({
    data: ocrRecords.map(ocr => ({ ...ocr, date: new Date().toString() }))
  })
}

main()
