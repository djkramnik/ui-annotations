import puppeteer, { Browser, Page } from 'puppeteer-core'
import {
  ApplyTransformations,
  getNumberArg,
  ProcessScreenshot,
  waitForEnter,
} from './util'
import { PrismaClient } from '@prisma/client'
import { getHnHrefs, scrolledToBottom, scrollY } from './dom'
import { processScreenText } from './configs/text'
import { applyInteractiveTransforms, processScreenForInteractive } from './configs/interactive'

const prisma = new PrismaClient()

let processScreen: ProcessScreenshot | null = null
const labelType = process.argv[2]
switch(labelType) {
  case 'interactive':
    processScreen = processScreenForInteractive
    break
  default:
    processScreen = processScreenText
    break
}

main({
  config: {
    processScreen,
    transform: applyInteractiveTransforms,
  },
  linkType: process.argv[3] ?? 'hn',
  maxPages: getNumberArg(process.argv[4]) ?? 5,
  maxLinks: getNumberArg(process.argv[5]) ?? undefined,
  maxScrollIndex: 2,
})

async function fetchUrls(tag: string): Promise<string[]> {
  const urls = await prisma.screenshot
    .findMany({
      where: {
        tag,
      },
    })
    .then((screenshot) => {
      return screenshot.map((s) => s.url)
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
          !link.startsWith('https://openai') &&
          !link.endsWith('.pdf')
      )
    case 'local':
      return ['http://127.0.0.1:8080']
    default:
      console.warn('invalid link type')
      return []
  }
}

async function main({
  config,
  linkType,
  maxPages,
  maxScrollIndex,
  maxLinks = 1000,
}: {
  config: {
    processScreen: ProcessScreenshot
    transform: ApplyTransformations
  },
  linkType: string
  maxPages: number
  maxScrollIndex: number
  maxLinks?: number
}) {
  console.log('scraper params:', {
    linkType,
    maxPages,
    maxScrollIndex,
    maxLinks,
    labelType,
  })
  // On macOS, Chrome is typically installed at this path
  const chromePath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

  let browser: Browser | null = null
  const urls = await fetchUrls(labelType === 'interactive'
    ? 'interactive'
    : 'ocr')
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

           const cleanup = await config.transform(page)

            // collect annotations
            // make the annotations, post them to backend
            const meta = await config.processScreen(page, link)

            linkCount += 1
            if (linkCount >= MAX_LINKS) {
              break
            }

            // remove effects
            await cleanup()

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