import puppeteer, { ScreenshotOptions, Page, Browser } from 'puppeteer-core'

main()

async function scrollToBottom(page: Page, maxScrolls = 30) {
  await page.evaluate(async (maxScrolls) => {
    let numScrolls = 0
    const snooze = () => new Promise(resolve => setTimeout(resolve, 100))
    await new Promise<void>((resolve) => {
      let lastScrollY = -1

      const timer = setInterval(async () => {
        window.scrollBy(0, 600) // scroll step
        await snooze()
        numScrolls += 1

        if ((Math.abs(window.scrollY - lastScrollY) < 10) || numScrolls >= maxScrolls) {
          clearInterval(timer)
          resolve()
        } else {
          lastScrollY = window.scrollY
        }
      }, 500) // adjust speed
    })
  }, maxScrolls)
}
async function scrollToTop(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const distance = 600
      const timer = setInterval(() => {
        window.scrollBy(0, -distance)
        if (window.scrollY <= 0) {
          clearInterval(timer)
          resolve()
        }
      }, 500)
    })
  })
}

async function main() {
  const isPathValid = (
    p: unknown,
  ): p is Readonly<ScreenshotOptions>['path'] => {
    return typeof p === 'string' && /.+\.(png|webp|jpeg)$/.test(p)
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
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2' })
    await scrollToBottom(page)
    await scrollToTop(page)
    await page.screenshot({ fullPage: true, path: outputPath })
  } catch (e) {
    console.error('uh oh', e)
  } finally {
    browser?.close()
    process.exit(0)
  }
}
