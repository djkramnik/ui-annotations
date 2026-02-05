import { Page } from "puppeteer-core"
import { prisma } from "../db"
import { getHnHrefs } from "../dom"

// with puppeteer loop through n pages of hacker news and scrape the urls
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
    ],
  } = options ?? {}

  // avoid these urls already collected and saved in the db based on tag
  // so basically the only purpose of tag is to avoid duplications
  // so this is called bad programming.
  const dupUrls = await (typeof tag === 'string'
    ? fetchUrls(tag)
    : [] as string[])

  let hnLinks: string[] = []

  for(let i = 0; i < maxPages; i += 1) {
    const tabName = 'news'
    await page.goto(`https://news.ycombinator.com/${tabName}?p=${i + 1}`)
    const newLinks = await page.evaluate(getHnHrefs)

    const filteredNewLinks = newLinks.filter(
      (link) => {
        const isDup = dupUrls.includes(link)
        const badStart = (verbotenStarts ?? []).some(st => link.startsWith(st))
        const badEnd = (verbotenEnds ?? []).some(ed => link.endsWith(ed))

        return !isDup && !badStart && !badEnd
      }
    )

    hnLinks = hnLinks.concat(filteredNewLinks)
  }

  // remove dups
  console.log('total hn links', new Set(hnLinks).size)
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