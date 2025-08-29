export enum AnnotationLabel {
  button = 'button',
  heading = 'heading',
  input = 'input',
  textRegion = 'textRegion',
}

export const annotationLabels: Record<AnnotationLabel, string> = {
  button: '#a8d1d0',
  heading: '#e3b1e3',
  input: '#e3a1a1',
  textRegion: 'cornsilk',
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

export function rectInViewport(r: DOMRect) {
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

  for (const root of roots) {
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

      const range = (root.ownerDocument ?? document).createRange()
      range.selectNodeContents(tn)

      const rects = range.getClientRects()

      for (const r of Array.from(rects)) {
        // need a filter for node candidates and then need a filter for rect
        if (!rectInViewport(r)) {
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
    }
  }
  yield out
}

function isInteractive(el: Element): boolean {
  const actionableRoles = new Set([
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
  ])
  const isDisabled =
    (el as any).disabled === true || el.getAttribute('aria-disabled') === 'true'
  if (isDisabled) {
    return false
  }
  const tag = el.tagName.toLowerCase()
  if (tag === 'button') return true
  if (tag === 'a' && (el as HTMLAnchorElement).href) return true
  if (tag === 'input') {
    const t = (el as HTMLInputElement).type?.toLowerCase()
    if (t !== 'hidden') return true
  }
  if (tag === 'textarea' || tag === 'select' || tag === 'summary') return true
  if ((el as HTMLElement).isContentEditable) return true
  const role = (el.getAttribute('role') || '').trim()
  if (role && actionableRoles.has(role)) return true
  const ti = (el as HTMLElement).tabIndex
  if (Number.isInteger(ti) && ti >= 0) return true
  const st = getComputedStyle(el)
  if (st.cursor === 'pointer') return true
  if ((el as any).onclick) return true
  return false
}

export async function* gatherInteractiveRegions(
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
  for (const root of roots) {
    const walker = (root as any).createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Node) => {
          const el = node as Element
          return filter(el)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
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
