import { Page } from "puppeteer-core"
import { prisma } from "../db"
import { getHnHrefs } from "../dom"

export const fetchHnLinks = async (page: Page, options?: Partial<{
  tag: string
  maxPages: number
  verbotenStarts?: string[] | null
  verbotenEnds?: string[] | null
}>): Promise<string[]> => {
  const {
    tag,
    maxPages = 5,
    verbotenStarts = [
      'https://news.ycombinator.com',
      'https://github.com',
      'https://arxiv.org',
      'https://openai',
    ],
    verbotenEnds = [
      '.pdf'
    ]
  } = options ?? {}

  // avoid these urls already collected and saved in the db
  const dupUrls = await (typeof tag === 'string'
    ? fetchUrls(tag)
    : [] as string[])

  let hnLinks: string[] = []

  for(let i = 0; i < maxPages; i += 1) {
    const tabName = 'news'
    await page.goto(`https://news.ycombinator.com/${tabName}?p=${i + 1}`)
    const newLinks = await page.evaluate(getHnHrefs)
    hnLinks = hnLinks.concat(newLinks.filter(
      (link) =>
        !dupUrls.includes(link) &&
        !(verbotenStarts ?? []).some(st => link.startsWith(st)) &&
        !(verbotenEnds ?? []).some(ed => !link.endsWith(ed))
    ))
  }

  // remove dups
  return Array.from(new Set(hnLinks))
}

async function fetchUrls(tag: string): Promise<string[]> {
  const urls = await prisma.screenshot
    .findMany({
      where: {
        tag,
      },
    })
    .then((screenshot) => {
      return screenshot.map((s) => s.url)
    })
  return Array.from(new Set(urls))
}