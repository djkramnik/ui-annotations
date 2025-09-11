/// <reference lib="dom" />

import { ElementHandle, Page } from "puppeteer-core";
import { AnnotationRequest, TextProposal } from "ui-labelling-shared";

export function getHnHrefs() {
  return Array.from(
    document.querySelectorAll('#bigbox .submission .titleline a')
  ).map(a => (a as HTMLAnchorElement).href)
}

export function getMetadata(page: Page, link: string, label: string): Promise<Omit<AnnotationRequest, 'annotations' | 'screenshot'>> {
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

export async function getFirstTextProposal(page: Page): Promise<TextProposal[]> {
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
