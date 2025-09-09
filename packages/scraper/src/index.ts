import puppeteer, { Browser } from "puppeteer-core";
import { waitForEnter } from "./util";
import { PrismaClient } from "@prisma/client";
import { getFirstTextProposal, getHnHrefs } from "./dom";


const prisma = new PrismaClient();

async function fetchUrls(): Promise<string[]> {
  const urls = await prisma.annotation.findMany({
    where: {
      tag: 'ocr'
    }
  }).then(annotation => {
    return annotation.map(a => a.url)
  })
  return Array.from(new Set(urls))
}

async function main() {
  // On macOS, Chrome is typically installed at this path
  const chromePath =
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  let browser: Browser | null = null;
  const urls = await fetchUrls()
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


    const MAX_PAGES = 1
    const tabName = 'news'
    let index = 0
    const page = await browser.newPage();
    for(index = 0; index < MAX_PAGES; index += 1) {
      try {
        await page.goto(`https://news.ycombinator.com/${tabName}?p=${index + 1}`)
        // get all the links of the right sort
        const links = await page.evaluate(getHnHrefs)
        for(const link of links) {
          console.log('navigating to new link', link)
          await page.goto(link, { waitUntil: "networkidle2" })
          const proposals = await getFirstTextProposal()
          console.log('PROPOSALS', proposals)
          // map to AnnotationPayload['annotations']
          // postprocess proposals... has to include merger of textContents..
          // yolo prediction... need to run pyservice I'm afraid
          // filter each proposal 2 way with ai predictions
          // prepare metadata... prepare request... make request


          break

        }
      } catch(e) {
        console.error('wtf', e)
      }
    }


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
