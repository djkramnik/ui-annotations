import puppeteer, { Browser } from "puppeteer-core";
import { waitForEnter } from "./util";

async function main() {
  // On macOS, Chrome is typically installed at this path
  const chromePath =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: false, // run with a visible browser window
      executablePath: chromePath, // use the system-installed Chrome
      defaultViewport: null, // let Chrome use the full window size
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const page = await browser.newPage();
    await page.goto("https://news.ycombinator.com");

    console.log('press enter to quit')
    await waitForEnter()

    process.exit(0)
  } catch (err) {
    console.error("Failed to launch Chrome:", err);

  } finally {
    browser?.close()
  }
}

main();
