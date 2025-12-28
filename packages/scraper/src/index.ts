import {
  ApplyTransformations,
  waitForEnter,
} from './util'
import { scrolledToBottom, scrollY } from './dom'
import { processScreenText } from './configs/text'
import { applyInteractiveTransforms, processScreenForInteractive } from './configs/interactive'
import { processScreenForSynth } from './configs/synth'
import { launchPuppeteer } from './util/puppeteer'
import { extractNamedArgs, scraperArgs, ScraperConfig, configName, ConfigName } from './util/args'

// TODO: REFACTOR:
// parse flag args (--) and have --processor --links --transform

// TODO: FEATURE
// a monitor mode.  So that from the CLI, after transform but prior to process,
// we can perform various options on the page to check if its truly ready for processing
// before proceeding. This is to debug / eliminate the mis-aligned bounding box issues that sometimes occur

const args = extractNamedArgs()
const parsedArgs = scraperArgs.safeParse(args)
if (parsedArgs.error) {
  console.error('error parsing scraper script args', parsedArgs.error)
  process.exit(0)
}
const config = mapArgs(parsedArgs.data)

main(config)
.catch((e) => {
  console.log(`unhandled exception`, e)
})

async function main(config: ScraperConfig) {
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

  const { browser, page } = await launchPuppeteer()
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

          const cleanup = await transform(page)

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
    console.error('Failed to launch Chrome:', err)
  } finally {
    browser?.close()
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
}): ScraperConfig {

  const processors: Record<ConfigName, ScraperConfig['processScreen']> = {
    'interactive': processScreenForInteractive,
    'text': processScreenText,
    'synth': processScreenForSynth
  }
  const transformers: Record<ConfigName, ApplyTransformations> = {
    'interactive': applyInteractiveTransforms,
    'text': applyInteractiveTransforms, // applyTextTransforms exists but was less reliable and I have no alt right now
    'synth': applyInteractiveTransforms,
  }

  const linkFetchers: Record<ConfigName, ScraperConfig['fetchLinks']> = {
    'interactive': () => Promise.resolve([]),
    'text': () => Promise.resolve([]),
    'synth': () => Promise.resolve([])
  }

  return {
    processScreen: processors[processor],
    transform: transformers[transform],
    fetchLinks: linkFetchers[links]
  }
}