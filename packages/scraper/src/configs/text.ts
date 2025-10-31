import {
  Annotation,
  AnnotationLabel,
  postProcessAdjacent,
} from 'ui-labelling-shared'
import {
  adjustViewport,
  adjustZoom,
  changeFontFamily,
  getDomTextProposal,
  getMetadata,
} from '../dom'
import {
  filterByOverlap,
  getRandomLocalFont,
  getRandomZoom,
  getYoloPredictions,
  postAnnotations,
  randInt,
  scaleYoloPreds,
  snooze,
} from '../util'
import { Page } from 'puppeteer-core'

export async function processScreenText(page: Page, link: string) {
  const proposals = await getDomTextProposal(page)
  if (proposals.length < 1) {
    return
  }

  const rawAnnotations = proposals.map((p) => {
    return {
      rect: p.rect,
      label: AnnotationLabel.textRegion,
      id: crypto.randomUUID(),
      textContent: p.textContent,
    }
  })
  console.log('unprocessed annotation len:', rawAnnotations.length)

  let processedAnnotations: Annotation[] = []
  for await (const update of postProcessAdjacent(rawAnnotations)) {
    if (Array.isArray(update)) {
      processedAnnotations = processedAnnotations.concat(update)
    }
  }

  console.log('processed annotations length', processedAnnotations.length)

  const meta = await getMetadata(page, link, 'ocr')
  const screenshot = await page.screenshot({ encoding: 'base64' })

  // yolo prediction
  const yoloResp = await getYoloPredictions({
    image_base64: screenshot,
    imgsz: 1024,
    conf: 0.1,
  })
  const yoloRawPreds = await yoloResp.json()
  const scaledYoloPreds = scaleYoloPreds(
    yoloRawPreds,
    meta.window.width,
    meta.window.height,
  )
  const annotationsVerifiedByAi = filterByOverlap(
    processedAnnotations,
    scaledYoloPreds,
    { overlapPct: 0.1, matchLabel: 'textRegion' },
  )
  console.log('verified by ai length', annotationsVerifiedByAi.length)

  await postAnnotations({
    annotations: annotationsVerifiedByAi,
    image_data: screenshot,
    ...meta,
  })
  // superstition
  await snooze()

  return meta
}

export async function applyTextTransforms(page: Page) {
  // apply transformations randomly
  adjustViewport({
    page,
    width: randInt(800, 1600),
    height: randInt(500, 992),
  })
  await snooze(5000)

  let removeFont = null
  // a quarter of the time change the font?
  if (Math.random() >= 0.75) {
    removeFont = await changeFontFamily(page, getRandomLocalFont())
    await snooze(5000)
  }
  let zoom = 1
  if (Math.random() >= 0.5) {
    zoom = getRandomZoom()
    await adjustZoom({ page, scale: zoom })
    await snooze(5000)
  }

  return async () => {
    removeFont?.remove()
    await adjustZoom({ page, scale:1 })
    await snooze()
  }
}
