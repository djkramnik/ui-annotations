import puppeteer, { Browser, LaunchOptions, Page } from "puppeteer-core"

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