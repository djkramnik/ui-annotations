// on further though ad-synth is a misnomer.  We are scraping here

import { Page } from "puppeteer-core"
import { InteractiveLabel } from "ui-labelling-shared"
import { snooze } from "../util"

export async function getAdLinks(reps: number = 20): Promise<string[]> {
  // look for links that load the ads in google_ads_iframe
  const links = [
    'https://buzzfeed.com',
    'https://www.telegraph.co.uk/',
    'https://news.yahoo.com',
    // 'https://news.yahoo.com/articles/own-government-attempted-execute-chicago-043218412.html',
    // 'https://www.buzzfeed.com/ellendurney/will-arnett-famous-guest-kicked-off-smartless-podcast?origin=hfspl',
    // 'https://www.nytimes.com/spotlight/lifestyle',
    // 'https://www.forbes.com/'

  ]
  return links.reduce((acc, l) => {
    return acc.concat(
      new Array(reps).fill(l)
    )
  }, [] as string[])
}

export async function transformForAd(page: Page) {
  await page.evaluate(async (label: string) => {
    function snooze(ms: number = 500) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms)
      })
    }
    await snooze(10000)
    const ads = document.querySelectorAll('[id^="google_ads_iframe"]')
    Array.from(ads).forEach(
      ad => ad.setAttribute('data-label', `label_${label}`)
    )


  }, String(InteractiveLabel.ad))
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important;}' })
  await snooze(5000)
  return async () => {}
}

