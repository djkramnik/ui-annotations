import puppeteer, { Browser } from "puppeteer-core";
import { postAnnotations, waitForEnter } from "./util";
import { PrismaClient } from "@prisma/client";
import { getFirstTextProposal, getHnHrefs, getMetadata } from "./dom";
import { AnnotationLabel, AnnotationPayload, postProcessAdjacent } from "ui-labelling-shared";


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
          if (urls.includes(link) || link.startsWith('https://news.ycombinator.com')) {
            console.log('Skipping link', link)
            continue
          }
          console.log('navigating to new link', link)
          await page.goto(link, { waitUntil: "networkidle2" })
          const proposals = await getFirstTextProposal(page)
          console.log('PROPOSALS', proposals)
          if (proposals.length < 1) {
            continue
          }

          const rawAnnotations = proposals.map(p => {
            return {
              rect: p.rect,
              label: AnnotationLabel.textRegion,
              id: crypto.randomUUID(),
              textContent: p.textContent
            }
          })
          console.log('unprocessed annotation len:', rawAnnotations.length)

          let processedAnnotations: AnnotationPayload['annotations'] = []
          for await (const update of postProcessAdjacent(rawAnnotations)) {
            if (Array.isArray(update)) {
              processedAnnotations = processedAnnotations.concat(update)
            }
          }

          console.log('processed annotations length', processedAnnotations.length)

          const meta = await getMetadata(page, link, 'ocr')

          await postAnnotations({
            annotations: processedAnnotations,
            screenshot: await page.screenshot({ encoding: "base64" }),
            ...meta
          })
          // postprocess proposals... has to include merger of textContents..

          // yolo prediction... need to run pyservice I'm afraid
          // filter each proposal 2 way with ai predictions
          // prepare metadata... prepare request... make request
          // inner loop of scroll?
          // inner loop of page transformations?

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
