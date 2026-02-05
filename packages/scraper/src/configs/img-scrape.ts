// we can perhaps just use the hn link fetcher.. but it would be nice to have a 'reddit' or 'youtube' crawler
// version where we start with some search query on reddit or youtube and then randomly crawl those sites

import { Page } from "puppeteer-core"
import { InteractiveLabel } from "ui-labelling-shared"
import { snooze } from "../util"

export async function getImgLinks(reps: number = 1): Promise<string[]> {
  const links = [
    'https://reddit.com',
  ]
  return links.reduce((acc, l) => {
    return acc.concat(
      new Array(reps).fill(l)
    )
  }, [] as string[])
}


export async function transformForImg(page: Page) {
  await page.evaluate(async (label: string) => {
    function snooze(ms: number = 500) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms)
      })
    }
    await snooze(10000)
    const imgs = document.querySelectorAll('img,image')
    Array.from(imgs).forEach(
      img => img.setAttribute('data-label', `label_${label}`)
    )


  }, String(InteractiveLabel.image))
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important;}' })
  await snooze(5000)
  return async () => {}
}


