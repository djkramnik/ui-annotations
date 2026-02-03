import { ElementHandle, Page } from 'puppeteer-core'
import { getMetadata } from '../dom'
import { saveSyntheticRecord } from '../util/interactive'
import { snooze } from '../util'
import { InteractiveLabel } from 'ui-labelling-shared'

// items per render

// framework

// accordion 5
// avatar 8
// button 10
// dropdown 1
// dropdown_menu 1
// datepicker 1
// calendar
// iconbutton 50
// pagination apx 50.. hard to make static
// radio 4
// checkbox 4
// slider 1
// textarea 5
// textinput 7
// toggle 6

// vanilla

// video 1
// filepicker 1
// file_drop 1


// some pages render more synth components than others
// lets say we want to aim for 100 crops per label per run
// then we need take the target (100) divided by the number of items rendered
const labelMultiplier: Partial<Record<InteractiveLabel, number>> = {

}

export async function getChimericLinks(defaultReps: number = 50): Promise<string[]> {
  const frameworkLabels: InteractiveLabel[] = [
    InteractiveLabel.accordion,
    InteractiveLabel.avatar,
    InteractiveLabel.button,
    InteractiveLabel.datepicker,
    InteractiveLabel.calendar,
    InteractiveLabel.dropdown,
    InteractiveLabel.dropdown_menu,
    InteractiveLabel.iconbutton,
    InteractiveLabel.pagination,
    InteractiveLabel.radio,
    InteractiveLabel.checkbox,
    InteractiveLabel.slider,
    InteractiveLabel.textarea,
    InteractiveLabel.textinput,
    InteractiveLabel.toggle
  ]
  const vanillaLabels: InteractiveLabel[] = [
    InteractiveLabel.filepicker,
    InteractiveLabel.file_drop
  ]

  // framework links will be reloaded defaultReps (or multiplier) number of times and alternate between mui and ant versions
  const frameworkLinks = frameworkLabels.reduce((acc, l) => {
    return acc.concat(new Array(labelMultiplier[l] ?? defaultReps)
      .fill(null)
      .map(
        (_, i) => `http://localhost:3000/${i % 2 ? 'mui' : 'ant'}?component=${l}`)
      )
  }, [] as string[])

  const vanillaLinks = vanillaLabels.reduce((acc, l) => {
    return acc.concat(
      new Array(labelMultiplier[l] ?? defaultReps)
        .fill(`http://localhost:3000?component=${l}`)
    )
  }, [] as string[])

  return frameworkLinks.concat(vanillaLinks)
}


const nextFrame = async (page: Page) => {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  )
}

const waitForStableRect = async (
  page: Page,
  el: ElementHandle<Element>,
  opts?: { maxTries?: number; settleFrames?: number; pixelTol?: number },
) => {
  const maxTries = opts?.maxTries ?? 12
  const settleFrames = opts?.settleFrames ?? 2
  const pixelTol = opts?.pixelTol ?? 0.5

  type Rect = { x: number; y: number; width: number; height: number }

  const getRect = async (): Promise<Rect | null> => {
    return el.evaluate((node) => {
      const r = (node as HTMLElement).getBoundingClientRect()
      if (!r || r.width <= 0 || r.height <= 0) return null
      // convert viewport coords -> page coords
      return {
        x: r.left + window.scrollX,
        y: r.top + window.scrollY,
        width: r.width,
        height: r.height,
      }
    })
  }

  const closeEnough = (a: Rect, b: Rect) =>
    Math.abs(a.x - b.x) <= pixelTol &&
    Math.abs(a.y - b.y) <= pixelTol &&
    Math.abs(a.width - b.width) <= pixelTol &&
    Math.abs(a.height - b.height) <= pixelTol

  let prev = await getRect()
  if (!prev) return null

  for (let i = 0; i < maxTries; i++) {
    for (let k = 0; k < settleFrames; k++) await nextFrame(page)
    const cur = await getRect()
    if (!cur) return null
    if (closeEnough(prev, cur)) return cur
    prev = cur
  }

  return prev
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
  const afterScrollWaitMs = opts?.afterScrollWaitMs ?? 0

  // Optional: kill smooth scroll + animations to reduce flake for synthetic capture
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      *, *::before, *::after { transition: none !important; animation: none !important; }
    `,
  }).catch(() => {
    // ignore if CSP blocks it
  })

  const elements = await page.$$('[data-label^="label_"]')

  for (const el of elements) {
    const labelName = await el.evaluate(
      (node) => (node as HTMLElement).getAttribute('data-label'),
    )
    if (!labelName) {
      await el.dispose()
      continue
    }

    // Scroll into view (don’t rely on fixed sleep alone)
    await el.evaluate((node) =>
      (node as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' }),
    )

    if (afterScrollWaitMs > 0) {
      await snooze(afterScrollWaitMs)
    }

    // Wait for the element’s rect to stop changing (reflow/scroll/animations)
    const rect = await waitForStableRect(page, el)
    if (!rect) {
      await el.dispose()
      continue
    }

    const pad = Math.max(0, Math.floor(paddingPx))

    // Prefer element screenshot (most robust), but we can’t pad directly with el.screenshot.
    // So:
    // - If no padding: use el.screenshot()
    // - If padding: use page.screenshot with a clip derived from getBoundingClientRect()
    let base64: string

    if (pad === 0) {
      base64 = (await el.screenshot({ encoding: 'base64' })) as string
    } else {
      const clip = {
        x: Math.max(0, Math.floor(rect.x - pad)),
        y: Math.max(0, Math.floor(rect.y - pad)),
        width: Math.ceil(rect.width + pad * 2),
        height: Math.ceil(rect.height + pad * 2),
      }

      if (clip.width <= 0 || clip.height <= 0) {
        await el.dispose()
        continue
      }

      base64 = (await page.screenshot({
        encoding: 'base64',
        clip,
        captureBeyondViewport: true,
      })) as string
    }

    await saveSyntheticRecord({
      label: labelSuffixFromId(labelName),
      base64,
      meta: { type: link.includes('mui') ? 'mui' : 'ant' },
    })

    await el.dispose()
  }

  const meta = await getMetadata(page, link, 'synthetic')
  return meta
}

function labelSuffixFromId(label: string): string {
  return label.startsWith('label_') ? label.slice('label_'.length) : label
}

export async function transformForSynth(page: Page) {
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important;}' })
  // no cleanup to do
  return async () => {}
}
