import puppeteer, { Browser, Page } from 'puppeteer-core'
import {
  filterByOverlap,
  getRandomLocalFont,
  getRandomZoom,
  getYoloPredictions,
  postAnnotations,
  randInt,
  scaleYoloPreds,
  waitForEnter,
} from './util'
import { PrismaClient } from '@prisma/client'
import { adjustViewport, adjustZoom, changeFontFamily, getFirstTextProposal, getHnHrefs, getMetadata, scrolledToBottom, scrollY } from './dom'
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
  maxLinks: 3,
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
          !link.startsWith('https://arxiv.org') &&
          !link.endsWith('.pdf')
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
  maxScrollIndex,
  maxLinks = 1000,
}: {
  linkType: string
  maxPages: number
  maxScrollIndex: number
  maxLinks?: number
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
    const MAX_LINKS = maxLinks

    let pageIndex = 0
    const page = await browser.newPage()

    let linkCount = 0
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

            // apply transformations randomly
            adjustViewport({
              page,
              width: randInt(800, 1600),
              height: randInt(500, 992),
            })
            await snooze()

            let removeFont = null
            // a quarter of the time change the font?
            if (Math.random() >= 0.75) {
              removeFont = await changeFontFamily(page, getRandomLocalFont())
            }
            let zoom = 1
            if (Math.random() >= 0.5) {
              zoom = getRandomZoom()
              await adjustZoom({ page, scale: zoom })
              await snooze()
            }

            // collect annotations
            // make the annotations, post them to backend
            const meta = await processScreen(page, link)

            linkCount += 1
            if (linkCount >= MAX_LINKS) {
              break
            }
            // remove effects
            removeFont?.remove()
            await adjustZoom({ page, scale:1 })
            await snooze()

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
        if (linkCount >= MAX_LINKS) {
          break
        }
      }
      if (linkCount >= MAX_LINKS) {
        break
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