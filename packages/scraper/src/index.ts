import {
  ApplyTransformations,
  snooze,
  waitForEnter,
} from './util'
import { scrolledToBottom, scrollY } from './dom'
import { processScreenText } from './configs/text'
import { applyInteractiveTransforms, processScreenForInteractive } from './configs/interactive'
import { getChimericLinks, processScreenForSynth } from './configs/synth'
import { launchPuppeteer } from './util/puppeteer'
import { extractNamedArgs, scraperArgs, ScraperConfig, configName, ConfigName } from './util/args'
import { Browser, Page } from 'puppeteer-core'
import { fetchHnLinks } from './configs/fetch-hn-links'

// TODO: FEATURE
// a monitor mode.  So that from the CLI, after transform but prior to process,
// we can perform various options on the page to check if its truly ready for processing
// before proceeding. This is to debug / eliminate the mis-aligned bounding box issues that sometimes occur

;(async () => {
  const args = extractNamedArgs()
  const parsedArgs = scraperArgs.safeParse(args)
  if (parsedArgs.error) {
    console.error('error parsing scraper script args', parsedArgs.error)
    process.exit(0)
  }

  let browser: Browser | null = null
  let page: Page | null = null
  try {
    const p = await launchPuppeteer()
    browser = p.browser
    page = p.page
    const config = mapArgs(parsedArgs.data, page)
    await main(config, page)
  } catch(e) {
    console.log(`unhandled exception`, e)
  } finally {
    browser?.close()
  }
})()

async function main(config: ScraperConfig, page: Page) {
  const {
    processScreen,
    transform,
    fetchLinks,
    maxScrollIndex = 3,
    maxLinks = 1000 }= config

  console.log('scraper params:', {
    maxScrollIndex,
    maxLinks,
  })

  const links = await fetchLinks()
  let linkIndex = 0

  try {
    for (const link of links) {
      if (linkIndex++ > (maxLinks ?? 1000)) {
        console.log('exceeded max links, abort')
        break
      }
      try {
        console.log('navigating to new link', link)
        await page.goto(withCacheBuster(link), { waitUntil: 'networkidle2' })

        // inner scroll loop.
        let scrollIndex = 0
        while (scrollIndex <= maxScrollIndex) {
          scrollIndex += 1

          await waitForEnter('pre transform')
          const cleanup = await transform(page)
          await snooze(5000)
          await waitForEnter('page was transformed')
          // collect annotations
          // make the annotations, post them to backend
          const meta = await processScreen(page, link)


          // remove effects
          await cleanup()

          // return meta null for early break.  or if scrolled to the bottom
          if (!meta || await scrolledToBottom(page)) {
            if (meta) {
              console.log('scrolled to bottom ', link, scrollIndex)
            } else {
              console.log('stopping early per processScreen', link, scrollIndex)
            }
            break
          }

          await scrollY(page, meta?.window.height / 2)
        }
      } catch (e) {
        console.error(`error processing link ${link}:${linkIndex}`, e)
      }
    }

    console.log('press enter to quit')
    await waitForEnter()

    process.exit(0)
  } catch (err) {
    console.error('error in outer layer of main', err)
  }
}

function withCacheBuster(rawUrl: string): string {
  const u = new URL(rawUrl);
  u.searchParams.set("__puppeteer_ts", String(Date.now()));
  return u.toString();
}

function mapArgs({
  processor,
  transform,
  links
}: {
  processor: ConfigName
  transform: ConfigName
  links: ConfigName
}, page: Page): ScraperConfig {
  const processors: Record<ConfigName, ScraperConfig['processScreen']> = {
    'interactive': processScreenForInteractive,
    'text': processScreenText,
    'synth': (page: Page, link: string) => {
      return processScreenForSynth(page, link, { paddingPx: 5 })
    }
  }
  const transformers: Record<ConfigName, ApplyTransformations> = {
    'interactive': applyInteractiveTransforms,
    'text': applyInteractiveTransforms, // applyTextTransforms exists but was less reliable and I have no alt right now
    'synth': applyInteractiveTransforms,
  }

  // this is messy
  const linkFetchers: Record<ConfigName, ScraperConfig['fetchLinks']> = {
    'interactive': () => {
      return fetchHnLinks(page, { tag: 'interactive' })
    },
    'text': () => {
      return fetchHnLinks(page, { tag: 'text' })
    },
    'synth': () => getChimericLinks(2)
  }

  return {
    processScreen: processors[processor],
    transform: transformers[transform],
    fetchLinks: linkFetchers[links]
  }
}