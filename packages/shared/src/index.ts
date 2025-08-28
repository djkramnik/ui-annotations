export enum AnnotationLabel {
  button = 'button',
  heading = 'heading',
  input = 'input',
}

export const annotationLabels: Record<AnnotationLabel, string> = {
  button: '#a8d1d0',
  heading: '#e3b1e3',
  input: '#e3a1a1',
}

/**
 * text region utility
 */

export function isInViewport({
  target,
  partial,
}: {
  target: Element
  partial?: boolean
}) {
  const { bottom, right, top, left } = target.getBoundingClientRect()

  if (partial) {
    return (
      bottom >= 0 &&
      right >= 0 &&
      top <= (window.innerHeight || document.documentElement.clientHeight) &&
      left <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  return (
    top >= 0 &&
    left >= 0 &&
    bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

export function elVisible(el: Element) {
  const st = getComputedStyle(el)
  if (
    st.display === 'none' ||
    st.visibility === 'hidden' ||
    parseFloat(st.opacity) === 0
  )
    return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
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

export async function* gatherTextRegions(
  opts: Partial<{
    batchSize: number
    minSize: number
    includeIFrames: boolean
  }>,
): AsyncGenerator<DOMRect[]> {
  const batchSize = opts.batchSize ?? 200
  const minSize = opts.minSize ?? 11
  const includeIFrames = opts.includeIFrames ?? false
  const roots: (Document | ShadowRoot)[] = [document]
  const viewport = {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  }
  const rectIntersectsViewport = (r: DOMRectReadOnly): boolean =>
    r.right > viewport.left &&
    r.left < viewport.right &&
    r.bottom > viewport.top &&
    r.top < viewport.bottom

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
  const out: DOMRect[] = []
  let processed = 0
  console.log('begin processing roots!', roots.length)
  for (const root of roots) {
    console.log('begin root processing', root)
    const walker = (root as any).createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Node) => {
        const t = node.nodeValue ?? ''
        return t.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      },
    } as any)

    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const tn = n as Text
      if (!nodeVisible(tn)) {
        console.log('node not visible??', tn.textContent)
        continue
      }

      const range = (root.ownerDocument ?? document).createRange()
      range.selectNodeContents(tn)

      const rects = range.getClientRects()

      for (const r of Array.from(rects)) {
        if (!rectIntersectsViewport(r)) {
          console.log('candidate rejected because not in viewport')
          continue
        }
        if (r.width < minSize || r.height < minSize) {
          console.log('candidate rejected because too small')
          continue
        }

        out.push(r)
        if (out.length >= batchSize) {
          yield out.splice(0, out.length)
          await new Promise(requestAnimationFrame)
        }
      }
      range.detach()

      // cooperative yielding on long pages
      if (++processed % 2000 === 0) {
        if (out.length) {
          yield out.splice(0, out.length)
        }
        await new Promise(requestAnimationFrame)
      }
    }
  }
  yield out
}
