/// <reference lib="dom" />

import { ElementHandle, Page } from "puppeteer-core";
import { ScreenshotRequest, TextProposal } from "ui-labelling-shared";

export function getHnHrefs() {
  return Array.from(
    document.querySelectorAll('#bigbox .submission .titleline a')
  ).map(a => (a as HTMLAnchorElement).href)
}

export function getMetadata(page: Page, link: string, label: string): Promise<Omit<ScreenshotRequest, 'annotations' | 'image_data'>> {
  return page.evaluate((link: string, label: string) => {
    return {
      url: link,
      date: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
      }),
      window: {
        scrollY: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      },
      tag: label
    }
  }, link, label)
}

export function scrollY(page: Page, amount?: number): Promise<void> {
  return page.evaluate((amount) => {
    window.scrollBy(0, amount ?? 200)
  }, amount)
}

export function scrolledToBottom(page: Page): Promise<boolean> {
  return page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      return Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 2; // some superstition
  })
}

export async function adjustViewport({
  page,
  width,
  height,
  dpr = 1,
}: {
  page: Page
  width: number
  height: number
  dpr?: number
}) {
  const client = await page.createCDPSession()
  return client.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: dpr, mobile: false,
  })
}

export async function adjustZoom({
  page,
  scale
}: {
  page: Page
  scale: number
}) {
  const client = await page.createCDPSession()
  return client.send('Emulation.setPageScaleFactor', {
    pageScaleFactor: scale
  })
}

export async function changeFontFamily(
  page: Page,
  family = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
): Promise<{ remove: () => Promise<void> }> {
  const css = `
    * { font-family: ${family} !important; }
  `;
  const style = await page.addStyleTag({ content: css });
  return {
    remove: async () => {
      try { await style.evaluate(el => el.remove()); } catch {}
      try { await style.dispose(); } catch {}
    }
  };
}

export async function getDomTextProposal(page: Page): Promise<TextProposal[]> {
  const out = await page.evaluate(async () => {
    function elVisible(el: Element) {
      const st = getComputedStyle(el)
      if (
        st.display === 'none' ||
        st.visibility === 'hidden' ||
        parseFloat(st.opacity) === 0
      ) {
        return false
      }
      return true
    }
    function nodeVisible(n: Node) {
      let el: Element | null =
        (n as any).parentElement ?? (n.parentNode as Element | null)
      while (el) {
        if (!elVisible(el)) return false
        el = el.parentElement
      }
      return true
    }

    function inViewport(r: DOMRect) {
      const viewport = {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      }
      return (
        r.right > viewport.left &&
        r.left < viewport.right &&
        r.bottom > viewport.top &&
        r.top < viewport.bottom
      )
    }

    function getTextNodeLineFragments(
      textNode: Text
    ): TextProposal[] {
      const parent = textNode.parentElement;
      if (!parent) return [];

      const data = textNode.data;
      const len = data.length;
      if (len === 0) return [];

      const range = document.createRange();
      const out: TextProposal[] = [];

      let start = 0;

      while (start < len) {
        let lastEnd = -1;
        let lastRect: DOMRect | null = null;

        // Grow the end offset until the selection would span more than one rect (wrap)
        for (let end = start + 1; end <= len; end++) {
          range.setStart(textNode, start);
          range.setEnd(textNode, end);

          const rects = range.getClientRects();

          if (rects.length === 0) {
            // (collapsed whitespace etc.) keep going; we don't record yet
            continue;
          }

          if (rects.length > 1) {
            // We've just wrapped; stop growing. Use the last single-line slice.
            break;
          }

          // Still a single line; remember this as the best slice so far
          lastEnd = end;
          const r = rects[0];
          lastRect = new DOMRect(r.left, r.top, r.width, r.height);
        }

        if (lastEnd === -1 || !lastRect) {
          // Nothing drawable from here; bail to avoid infinite loop
          break;
        }

        out.push({
          textContent: data.slice(start, lastEnd),
          rect: lastRect,
        });

        start = lastEnd; // continue with the remainder of the node
      }
      return out;
    }

    async function* gatherTextRegions(
      opts: Partial<{
        batchSize: number
        minSize: number
        includeIFrames: boolean
      }>,
    ): AsyncGenerator<TextProposal[]> {
      const batchSize = opts.batchSize ?? 200
      const minSize = opts.minSize ?? 11
      const includeIFrames = opts.includeIFrames ?? false
      const roots: (Document | ShadowRoot)[] = [document]

      // gather doc roots
      document.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el.shadowRoot) {
          roots.push(el.shadowRoot as ShadowRoot)
        }
      })
      if (includeIFrames) {
        document.querySelectorAll('iframe').forEach((f) => {
          try {
            // test for same-origin
            // todo: shadow roots in iframe missing
            const d = (f as HTMLIFrameElement).contentDocument
            if (d) {
              roots.push(d as Document)
            }
          } catch {
            // cross origin I suppose?
          }
        })
      }
      const out: TextProposal[] = []

      for (const root of roots) {
        if (typeof (root as any).createTreeWalker !== 'function') {
          console.log('cannot create tree walker!', root)
          continue
        }
        const walker = (root as any).createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: (node: Node) => {
            const t = node.nodeValue ?? ''
            return t.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
          },
        } as any)

        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const tn = n as Text
          if (!nodeVisible(tn)) {
            console.log('node not visible??')
            continue
          }

          const textProposals = getTextNodeLineFragments(tn)

          for (const p of textProposals) {
            console.log('...huh?', p.rect)
            // need a filter for node candidates and then need a filter for rect
            if (!inViewport(p.rect)) {
              console.log('candidate rejected because not in viewport')
              continue
            }
            if (p.rect.width < minSize || p.rect.height < minSize) {
              console.log('candidate rejected because too small')
              continue
            }


            out.push({
              textContent: p.textContent,
              rect: {
                x: p.rect.x,
                y: p.rect.y,
                width: p.rect.width,
                height: p.rect.height,
              } as DOMRect
            })
            if (out.length >= batchSize) {
              yield out.splice(0, out.length)
              await new Promise(requestAnimationFrame)
            }
          }
        }
      }
      yield out
    }

    let textProposals: TextProposal[] = []
    for await (const proposals of gatherTextRegions({ batchSize: 50 })) {
      if (Array.isArray(proposals)) {
        console.log("Batch size:", proposals.length);
        textProposals = textProposals.concat(proposals)
      } else {
        console.warn("Unknown chunk type:", proposals);
      }
    }

    return textProposals
  })
  return out
}

export async function getDomInteractiveProposal(page: Page): Promise<{
  x: number,
  y: number,
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
}[]> {
  const out = await page.evaluate(async () => {

    function isInteractive(el: Element): boolean {
      console.log('the great interactive filter!')

      const isDisabled =
        (el as any).disabled === true || el.getAttribute('aria-disabled') === 'true'
      if (isDisabled) {
        return false
      }
      const tag = el.tagName.toLowerCase()

      // true because button good
      if (tag === 'button') {
        return true
      }

      // true because anchor tag with href
      if (tag === 'a' && (el as HTMLAnchorElement).href) {
        return true
      }

      // true because input and not hidden
      if (tag === 'input') {
        const t = (el as HTMLInputElement).type?.toLowerCase()
        if (t !== 'hidden') return true
      }

      // true because blue blooded form components
      if (tag === 'textarea' || tag === 'select' || tag === 'summary') {
        return true
      }

      // true because funky contenteditable
      if ((el as HTMLElement).isContentEditable) {
        return true
      }

      // true because screenreader said so
      const role = (el.getAttribute('role') || '').trim()
      if ([
        'button',
        'link',
        'checkbox',
        'radio',
        'switch',
        'textbox',
        'combobox',
        'menuitem',
        'tab',
        'slider',
      ].includes(role)) {
        return true
      }

      // true because tab index???
      // const ti = (el as HTMLElement).tabIndex
      // if (Number.isInteger(ti) && ti >= 0) return true

      // true because mouse cursor
      const st = getComputedStyle(el)
      if (st.cursor === 'pointer') {
        return true
      }
      // true because javascript
      if ((el as any).onclick) {
        return true
      }
      return false
    }

    function elVisible(el: Element) {
      const st = getComputedStyle(el)
      if (
        st.display === 'none' ||
        st.visibility === 'hidden' ||
        parseFloat(st.opacity) === 0
      ) {
        return false
      }
      return true
    }

    function nodeVisible(n: Node) {
      let el: Element | null =
        (n as any).parentElement ?? (n.parentNode as Element | null)
      while (el) {
        if (!elVisible(el)) return false
        el = el.parentElement
      }
      return true
    }

    function rectInViewport(r: DOMRect) {
      const viewport = {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      }
      return (
        r.right > viewport.left &&
        r.left < viewport.right &&
        r.bottom > viewport.top &&
        r.top < viewport.bottom
      )
    }

    async function* gatherInteractiveRegions(
      opts: Partial<{
        batchSize: number
        minSize: number
        includeIFrames: boolean
        isInteractive: (el: Element) => boolean
      }>,
    ): AsyncGenerator<DOMRect[]> {
      const batchSize = opts.batchSize ?? 200
      const minSize = opts.minSize ?? 11
      const includeIFrames = opts.includeIFrames ?? false
      const filter = opts.isInteractive ?? isInteractive

      const roots: (Document | ShadowRoot)[] = [document]
      document.querySelectorAll<HTMLElement>('*').forEach((el) => {
        if (el.shadowRoot) roots.push(el.shadowRoot as ShadowRoot)
      })
      if (includeIFrames) {
        document.querySelectorAll('iframe').forEach((f) => {
          try {
            const d = (f as HTMLIFrameElement).contentDocument
            if (d) roots.push(d as Document)
          } catch {
            /* cross-origin iframe */
          }
        })
      }

      const out: DOMRect[] = []
      console.log('processing interactive roots!')
      for (const root of roots) {
        if (typeof (root as any).createTreeWalker !== 'function') {
          console.log('cannot create tree walker!', root)
          continue
        }
        const walker = (root as any).createTreeWalker(
          root,
          NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node: Node) => {
              const el = node as Element
              return filter(el)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP
            },
          } as any,
        )

        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n as Element
          if (!nodeVisible(el)) {
            console.log('interactive candidate not visible')
            continue
          }

          const r = el.getBoundingClientRect()
          if (!rectInViewport(r)) {
            console.log('interactive candidate not in viewport')
            continue
          }
          if (r.width < minSize || r.height < minSize) {
            console.log('interactive candidate too small')
            continue
          }

          out.push(r)
          if (out.length >= batchSize) {
            yield out.splice(0, out.length)
            await new Promise(requestAnimationFrame)
          }
        }
      }
      yield out
    }
    let interactiveProposals: DOMRect[] = []
    for await (const proposals of gatherInteractiveRegions({ batchSize: 50 })) {
      if (Array.isArray(proposals)) {
        console.log("Batch size:", proposals.length);
        interactiveProposals = interactiveProposals.concat(...proposals)
      } else {
        console.warn("Unknown chunk type:", proposals);
      }
    }
    // need a plain js object, DOMRect will not survive the great barrier
    return interactiveProposals.map((r) => ({
      bottom: r.bottom,
      top: r.top,
      left: r.left,
      right: r.right,
      height: r.height,
      width: r.width,
      x: r.x,
      y: r.y,
    }))
  })

  return out
}
