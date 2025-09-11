import puppeteer, { Browser, Page } from 'puppeteer-core'
import {
  filterByOverlap,
  getYoloPredictions,
  postAnnotations,
  scaleYoloPreds,
  waitForEnter,
} from './util'
import { PrismaClient } from '@prisma/client'
import { getFirstTextProposal, getHnHrefs, getMetadata, scrolledToBottom, scrollY } from './dom'
import {
  AnnotationLabel,
  AnnotationPayload,
  postProcessAdjacent,
} from 'ui-labelling-shared'

const prisma = new PrismaClient()

main({
  linkType: 'hn',
  maxPages: 1,
  maxScrollIndex: 2,
})

async function snooze(ms: number = 2000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchUrls(): Promise<string[]> {
  const urls = await prisma.annotation
    .findMany({
      where: {
        tag: 'ocr',
      },
    })
    .then((annotation) => {
      return annotation.map((a) => a.url)
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
  switch (type) {
    case 'hn':
      const tabName = 'news'
      await page.goto(`https://news.ycombinator.com/${tabName}?p=${index + 1}`)
      const hnLinks = await page.evaluate(getHnHrefs)
      return hnLinks.filter(
        (link) =>
          !backendUrls.includes(link) &&
          !link.startsWith('https://news.ycombinator.com') &&
          !link.startsWith('https://github.com') &&
          !link.startsWith('https://arxiv.org')
      )
    case 'local':
      return ['http://127.0.0.1:8080']
    default:
      console.warn('invalid link type')
      return []
  }
}

async function processScreen(page: Page, link: string) {
  const proposals = await getFirstTextProposal(page)
  // console.log('PROPOSALS', proposals)
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

  let processedAnnotations: AnnotationPayload['annotations'] = []
  for await (const update of postProcessAdjacent(rawAnnotations)) {
    if (Array.isArray(update)) {
      processedAnnotations = processedAnnotations.concat(update)
    }
  }

  console.log(
    'processed annotations length',
    processedAnnotations.length,
  )

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
    screenshot,
    ...meta,
  })
  // superstition
  await snooze()

  return meta
}

async function main({
  linkType,
  maxPages,
  maxScrollIndex
}: {
  linkType: string
  maxPages: number
  maxScrollIndex: number
}) {
  // On macOS, Chrome is typically installed at this path
  const chromePath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

  let browser: Browser | null = null
  const urls = await fetchUrls()
  try {
    browser = await puppeteer.launch({
      headless: false, // run with a visible browser window
      executablePath: chromePath, // use the system-installed Chrome
      defaultViewport: null, // let Chrome use the full window size
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const MAX_PAGES = maxPages
    const MAX_SCROLL_INDEX = maxScrollIndex


    let pageIndex = 0
    const page = await browser.newPage()
    for (pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
      const links = await getLinks({
        backendUrls: urls,
        index: pageIndex,
        page,
        type: linkType,
      })

      for (const link of links) {
        try {
          console.log('navigating to new link', link)
          await page.goto(link, { waitUntil: 'networkidle2' })

          // inner scroll loop.
          let scrollIndex = 0

          while (scrollIndex <= MAX_SCROLL_INDEX) {
            scrollIndex += 1

            // make the annotations, post them to backend
            const meta = await processScreen(page, link)

            // if we failed to get any annotations or if we are scrolled to bottom stop this inner loop
            if (!meta || await scrolledToBottom(page)) {
              break
            }

            await scrollY(page, meta?.window.height / 2)
            // perform a page transformation here


          }
        } catch (e) {
          console.error('wtf', e)
        }
      }
    }

    console.log('press enter to quit')
    await waitForEnter()

    process.exit(0)
  } catch (err) {
    console.error('Failed to launch Chrome:', err)
  } finally {
    browser?.close()
  }
}