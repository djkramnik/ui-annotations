import puppeteer, { Browser, Page } from "puppeteer-core";
import { filterByOverlap, getYoloPredictions, postAnnotations, scaleYoloPreds, waitForEnter } from "./util";
import { PrismaClient } from "@prisma/client";
import { getFirstTextProposal, getHnHrefs, getMetadata } from "./dom";
import { AnnotationLabel, AnnotationPayload, postProcessAdjacent } from "ui-labelling-shared";

const prisma = new PrismaClient();

async function fetchUrls(): Promise<string[]> {
  const urls = await prisma.annotation.findMany({
    where: {
      tag: 'ocr'
    }
  }).then(annotation => {
    return annotation.map(a => a.url)
  })
  return Array.from(new Set(urls))
}

async function getLinks({
  type,
  backendUrls,
  index,
  page,
}: {
  type: string
  backendUrls: string[]
  index: number
  page: Page
}): Promise<string[]> {
  switch(type) {
    case 'hn':
      const tabName = "new"
      await page.goto(`https://news.ycombinator.com/${tabName}?p=${index + 1}`)
      const hnLinks = await page.evaluate(getHnHrefs)
      return hnLinks.filter(link => !backendUrls.includes(link) && !link.startsWith('https://news.ycombinator.com'))
    case 'local':
      return [
        'http://127.0.0.1:8080'
      ]
    default:
      console.warn('invalid link type')
      return []
  }
}

async function main() {
  // On macOS, Chrome is typically installed at this path
  const chromePath =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  let browser: Browser | null = null;
  const urls = await fetchUrls()
  try {
    browser = await puppeteer.launch({
      headless: false, // run with a visible browser window
      executablePath: chromePath, // use the system-installed Chrome
      defaultViewport: null, // let Chrome use the full window size
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const MAX_PAGES = 1
    let index = 0
    const page = await browser.newPage();
    for(index = 0; index < MAX_PAGES; index += 1) {
      try {
        const links = await getLinks({ backendUrls:  urls, index, page, type: 'local'})

        for(const link of links) {
          console.log('navigating to new link', link)
          await page.goto(link, { waitUntil: "networkidle2" })
          const proposals = await getFirstTextProposal(page)
          console.log('PROPOSALS', proposals)
          if (proposals.length < 1) {
            continue
          }

          const rawAnnotations = proposals.map(p => {
            return {
              rect: p.rect,
              label: AnnotationLabel.textRegion,
              id: crypto.randomUUID(),
              textContent: p.textContent
            }
          })
          console.log('unprocessed annotation len:', rawAnnotations.length)

          let processedAnnotations: AnnotationPayload['annotations'] = []
          for await (const update of postProcessAdjacent(rawAnnotations)) {
            if (Array.isArray(update)) {
              processedAnnotations = processedAnnotations.concat(update)
            }
          }

          console.log('processed annotations length', processedAnnotations.length)

          const meta = await getMetadata(page, link, 'ocr')
          const screenshot = await page.screenshot({ encoding: "base64" })

          // yolo prediction
          const yoloResp = await getYoloPredictions({
            image_base64: screenshot,
            imgsz: 1024,
            conf: 0.1
          })
          const yoloRawPreds = await yoloResp.json()
          const scaledYoloPreds = scaleYoloPreds(yoloRawPreds, meta.window.width, meta.window.height)
          const annotationsVerifiedByAi = filterByOverlap(
            processedAnnotations,
            scaledYoloPreds,
            { overlapPct: 0.1, matchLabel: 'textRegion' }
          )
          console.log('verified by ai length', annotationsVerifiedByAi.length)

          await postAnnotations({
            annotations: annotationsVerifiedByAi,
            screenshot,
            ...meta
          })

          break
        }
      } catch(e) {
        console.error('wtf', e)
      }
    }

    console.log('press enter to quit')
    await waitForEnter()

    process.exit(0)
  } catch (err) {
    console.error("Failed to launch Chrome:", err);

  } finally {
    browser?.close()
  }
}

main();
