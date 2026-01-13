import puppeteer, { Browser, LaunchOptions, Page } from "puppeteer-core"
import { adjustViewport, adjustZoom, changeFontFamily } from "../dom"
import { getRandomLocalFont, randInt, snooze } from "."

export const launchPuppeteer = async (options?: LaunchOptions): Promise<{
  browser: Browser
  page: Page
}> => {
  const defaultOpts: LaunchOptions = {
    headless: false, // run with a visible browser window
    executablePath: process.env.CHROME_APP_PATH
      ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // use the system-installed Chrome
    defaultViewport: null, // let Chrome use the full window size
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
  const browser = await puppeteer.launch(options ?? defaultOpts)
  const page = await browser.newPage()

  return { browser, page }
}

export async function getTransformFn({
  viewport,
  getFont,
  zoom,
  debug,
  pause = 0,
  randomness = {
    viewport: 0,
    font: 0.25,
    zoom: 0.5
  }
}: {
  viewport?: { width: [number, number]; height: [number, number] }
  getFont?: () => string
  zoom?: number[] // randomly picks from a zoom here
  debug?: boolean
  pause?: number // ms pause between transforms
  randomness?: {
    viewport: number,
    font: number,
    zoom: number
  }
}) {

  return async function transformPage(page: Page) {
    if (viewport && Math.random() > (1 - randomness.viewport)) {
      if (debug) {
        console.log('adjusting viewport', viewport)
      }
      await adjustViewport({
        page,
        width: randInt(viewport.width[0], viewport.width[1]),
        height: randInt(viewport.height[0], viewport.height[1])
      })
      await snooze(pause)
    }

    let removeFont = null
    if (getFont && Math.random() > (1 - randomness.font)) {
      if (debug) {
        console.log('changing font', getFont.name)
      }
      removeFont = await changeFontFamily(page, getFont())
      await snooze(pause)
    }

    if (zoom && Math.random() > (1 - randomness.zoom)) {
      if (debug) {
        console.log('adjusting zoom', zoom)
      }
      await adjustZoom({ page, scale: zoom[randInt(0, zoom.length)] })
      await snooze(pause)
    }

    return async () => {
      removeFont?.remove()
      if (zoom) {
        await adjustZoom({ page, scale:1 })
      }
      await snooze(pause)
    }
  }
}