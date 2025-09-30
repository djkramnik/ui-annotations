import { Page } from "puppeteer-core"
import { getDomInteractiveProposal, getDomTextProposal, getMetadata } from "../dom"
import { AnnotationLabel, AnnotationPayload, postProcessNested } from "ui-labelling-shared"
import { filterByOverlap, getYoloPredictions, postAnnotations, scaleYoloPreds, snooze } from "../util"

export async function processScreenForInteractive(page: Page, link: string) {
  const proposals = await getDomInteractiveProposal(page)
  // console.log('PROPOSALS', proposals)
  if (proposals.length < 1) {
    return
  }

  const rawAnnotations = proposals.map((p) => {
    return {
      rect: p,
      label: AnnotationLabel.interactive,
      id: crypto.randomUUID(),
    }
  })
  console.log('unprocessed annotation len:', rawAnnotations.length)

  let processedAnnotations: AnnotationPayload['annotations'] = []
  for await (const update of postProcessNested(rawAnnotations)) {
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
  }, 'interactive')
  const yoloRawPreds = await yoloResp.json()
  const scaledYoloPreds = scaleYoloPreds(
    yoloRawPreds,
    meta.window.width,
    meta.window.height,
  )
  const annotationsVerifiedByAi = filterByOverlap(
    processedAnnotations,
    scaledYoloPreds,
    { overlapPct: 0.1, matchLabel: 'interactive' },
  )
  console.log('verified by ai length', annotationsVerifiedByAi.length)

  await postAnnotations({
    annotations: annotationsVerifiedByAi,
    screenshot,
    ...meta,
  })
  // superstition
  await snooze()

  return meta
}