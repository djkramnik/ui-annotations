import { Page } from 'puppeteer-core'
import { getMetadata } from '../dom'
import { saveSyntheticCrop } from '../util/crop'

export async function getChimericLinks(reps: number = 50): Promise<string[]> {
  const labels = [
    'accordion',
    'avatar',
    'button',
    'datepicker',
    'dropdown',
    'icon',
    'pagination',
    'radio',
    'selectablecard', // checkbox also gets gathered here
    'slider',
    'textarea',
    'textinput',
    'toggle'
  ]

  return labels.reduce((acc, l) => {
    return acc.concat(new Array(reps)
      .fill(null)
      .map((_, i) => `http://localhost:3000/${i % 2 ? 'mui' : 'ant'}/${l}`)
    )
  }, [] as string[])

  return []
}

export async function processScreenForSynth(
  page: Page,
  link: string,
  opts?: {
    paddingPx?: number
    afterScrollWaitMs?: number
  },
) {
  const paddingPx = opts?.paddingPx ?? 0
  const afterScrollWaitMs = opts?.afterScrollWaitMs ?? 2000

  // Select all elements whose id starts with "label_"
  const elements = await page.$$('[id^="label_"]')

  for (const el of elements) {
    // Get id (cheap, no evaluate needed)
    const id = await el.evaluate((node) => (node as HTMLElement).id)
    if (!id) continue

    // Ensure element is on screen
    await el.evaluate((node) =>
      (node as HTMLElement).scrollIntoView({
        block: 'center',
        inline: 'center',
      }),
    )

    await snooze(afterScrollWaitMs)

    const box = await el.boundingBox()
    if (!box) {
      // element might be display:none or detached
      await el.dispose()
      continue
    }

    const pad = Math.max(0, Math.floor(paddingPx))

    const clip = {
      x: Math.max(0, Math.floor(box.x - pad)),
      y: Math.max(0, Math.floor(box.y - pad)),
      width: Math.ceil(box.width + pad * 2),
      height: Math.ceil(box.height + pad * 2),
    }

    if (clip.width <= 0 || clip.height <= 0) {
      await el.dispose()
      continue
    }

    const base64 = (await page.screenshot({
      encoding: 'base64',
      clip,
      captureBeyondViewport: true,
    })) as string

    await saveSyntheticCrop({
      label: labelSuffixFromId(id),
      base64,
      ogWidth: clip.width,
      ogHeight: clip.height,
    })

    await el.dispose()
  }

  const meta = await getMetadata(page, link, 'synthetic')
  return meta
}

const snooze = (ms: number = 2000) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

function labelSuffixFromId(id: string): string {
  return id.startsWith('label_') ? id.slice('label_'.length) : id
}
