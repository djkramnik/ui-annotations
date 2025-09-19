
import puppeteer, { ScreenshotOptions, Page } from 'puppeteer-core'

main()

async function scrollToBottom(page: Page, maxScrolls = 30) {
  await page.evaluate(async () => {
    let numScrolls = 0
    await new Promise<void>((resolve) => {
      let lastScrollY = -1;

      const timer = setInterval(() => {
        window.scrollBy(0, 600); // scroll step
        numScrolls += 1
        if (window.scrollY === lastScrollY || numScrolls >= maxScrolls) {
          clearInterval(timer);
          resolve();
        } else {
          lastScrollY = window.scrollY;
        }
      }, 200); // adjust speed
    });
  })
}
async function scrollToTop(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let current = window.scrollY;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, -distance);
        current -= distance;

        if (current <= 0) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  })
}

async function main() {
  const isPathValid = (p: unknown): p is Readonly<ScreenshotOptions>['path'] => {
    return typeof p === 'string' && /.+\.(png|webp|jpeg)$/.test(p)
  }
  const url = process.argv[2]
  if (!url) {
    console.error('Provide a url arg to this script')
    process.exit(1)
  }
  const outputPath: Readonly<ScreenshotOptions>['path']
    = isPathValid(process.argv[3])
      ? process.argv[3]
      : `${new Date().getTime()}.png`

  const chromePath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: chromePath,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle2' })
  await scrollToBottom(page)
  // await scrollToTop(page)
  await page.screenshot({ fullPage: true, path: outputPath })
  process.exit(0)
}