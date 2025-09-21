import puppeteer, { ScreenshotOptions, Browser } from 'puppeteer-core'
// @ts-ignore
import fullPageScreenshot from 'puppeteer-full-page-screenshot'

main()

async function main() {

  const isPathValid = (
    p: unknown,
  ): p is Readonly<ScreenshotOptions>['path'] => {
    return typeof p === 'string' && /.+\.(png|webp|jpeg)$/.test(p)
  }

  const waitForEnter = (): Promise<void> => {
    return new Promise((resolve) => {
      process.stdin.once('data', function () {
        resolve()
      })
    })
  }
  const snooze = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  const url = process.argv[2]
  if (!url) {
    console.error('Provide a url arg to this script')
    process.exit(1)
  }
  const outputPath: Readonly<ScreenshotOptions>['path'] = isPathValid(
    process.argv[3],
  )
    ? process.argv[3]
    : `${new Date().getTime()}.png`

  const chromePath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  let browser: Browser | null = null
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: chromePath,
      defaultViewport: {
        width: 1600,
        height: 1000,
      },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()

    // amateur night requires this to be on page object
    // @ts-ignore
    page.waitForTimeout = snooze
    await page.goto(url, { waitUntil: 'networkidle2' })

    // modify the sticky elements on the page wtf then press enter
    await waitForEnter()

    await fullPageScreenshot(page, { path: outputPath, delay: 1000 })
  } catch (e) {
    console.error('uh oh', e)
  } finally {
    browser?.close()
    process.exit(0)
  }
}
