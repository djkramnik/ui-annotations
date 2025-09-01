export enum AnnotationLabel {
  button = 'button',
  heading = 'heading',
  input = 'input',
  textRegion = 'textRegion',
  interactive = 'interactive'
}

export const annotationLabels: Record<AnnotationLabel, string> = {
  button: '#a8d1d0',
  heading: '#e3b1e3',
  input: '#e3a1a1',
  textRegion: 'cornsilk',
  interactive: '#82b2c0'
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

export interface AnnotationPayload {
  annotations: {
    id: string
    label: string
    rect: { x: number; y: number; width: number; height: number }
  }[]
}

export interface Annotations {
  url: string
  payload: AnnotationPayload
  screenshot: ArrayBuffer
  scrollY: number
  viewHeight: number
  viewWidth: number
  date: string
  id: number
  published: | 0 | 1
}

type Rect = AnnotationPayload['annotations'][0]['rect']
function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    (inner.x + inner.width)  <= (outer.x + outer.width) &&
    (inner.y + inner.height) <= (outer.y + outer.height)
  )
}

// remove annotations that are contained within bigger annotations
export async function* postProcessNested(
  annotations: AnnotationPayload['annotations'],
  opts?: Partial<{
    filterBy: string
    batchSize: number
  }>): AsyncGenerator<number | AnnotationPayload['annotations']> {
    const {
      filterBy,
      batchSize = 50,
    } = opts ?? {}
    const regions = typeof filterBy === 'string'
      ? annotations.filter(a => a.label === filterBy)
      : annotations.slice(0)
    // sort largest to smallest
    const sortedRegions = regions.sort((a, b) => {
      return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height)
    })
    const out: AnnotationPayload['annotations'] = []
    let processed = 0

    for(const r of sortedRegions) {
      for(const k of out) {
        if (contains(r.rect, k.rect)) {
          processed += 1
          if (processed % batchSize === 0) {
            yield processed
          }
          break
        }
      }
      processed += 1
      out.push(r)
      if (processed % batchSize === 0) {
        yield processed
      }
    }
    yield out
}

// merge annotations that are horizontally adjacent
export async function* postProcessAdjacent(
  annotations: AnnotationPayload['annotations'],
  opts?: Partial<{
    filterBy: string
    batchSize: number
    tolerance: number
    yTolerance: number
  }>
): AsyncGenerator<number | AnnotationPayload['annotations']> {
  const batchSize = Math.max(1, opts?.batchSize ?? 100)
  const tolerance = Math.max(0, opts?.tolerance ?? 2)
  const yTolerance = Math.max(0.5, Math.min(1, opts?.yTolerance ?? 0.95))
  const targetLabel = opts?.filterBy

  // Split: targets to process vs passthrough (unaffected)
  const targets = targetLabel
    ? annotations.filter(a => a.label === targetLabel)
    : annotations.slice(0)
  const passthrough = targetLabel
    ? annotations.filter(a => a.label !== targetLabel)
    : []

  // Nothing to do?
  if (targets.length <= 1) {
    yield targets.length
    yield (passthrough.length ? [...targets, ...passthrough] : targets)
    return
  }

  // Helpers
  type R = typeof targets[number] & {
    right: number
    bottom: number
  }
  const asRect = (a: typeof targets[number]): R => ({
    ...a,
    right: a.rect.x + a.rect.width,
    bottom: a.rect.y + a.rect.height,
  })

  const yOverlap = (a: R, b: R) =>
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.rect.y, b.rect.y))

  const yOverlapRatio = (a: R, b: R) =>
    yOverlap(a, b) / Math.min(a.rect.height, b.rect.height)

  const hGap = (a: R, b: R) => b.rect.x - a.right // can be negative (overlap)

  // Build rough "rows" by vertical overlap to avoid cross-line merges
  const MIN_Y_OVERLAP_RATIO = yTolerance
  const rects = targets
    .filter(a => a.rect.width > 0 && a.rect.height > 0)
    .map(asRect)
    .sort((a, b) => (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x))

  type Row = { boxes: R[]; top: number; bottom: number; height: number }
  const rows: Row[] = []
  for (const r of rects) {
    let placed = false
    for (const row of rows) {
      const overlap = Math.max(0, Math.min(row.bottom, r.bottom) - Math.max(row.top, r.rect.y))
      const ratio = overlap / Math.min(row.height, r.rect.height)
      if (ratio >= MIN_Y_OVERLAP_RATIO) {
        row.boxes.push(r)
        placed = true
        break
      }
    }
    if (!placed) {
      rows.push({ boxes: [r], top: r.rect.y, bottom: r.bottom, height: r.rect.height })
    }
  }

  // Merge left→right inside each row
  const merged: AnnotationPayload['annotations'] = []
  let processed = 0

  for (const row of rows) {
    row.boxes.sort((a, b) => (a.rect.x - b.rect.x) || (a.rect.y - b.rect.y))

    let current: R | null = null
    for (const r of row.boxes) {
      processed++
      if (processed % batchSize === 0) {
        yield processed
      }

      if (!current) {
        current = r
        continue
      }
      const gap = hGap(current, r)

      if (gap <= tolerance) {
        // Merge r into current (keep leftmost id/label)
        const left = Math.min(current.rect.x, r.rect.x)
        const top = Math.min(current.rect.y, r.rect.y)
        const right = Math.max(current.right, r.right)
        const bottom = Math.max(current.bottom, r.bottom)

        current = {
          ...current,
          // keep current.id and current.label
          rect: { x: left, y: top, width: right - left, height: bottom - top },
          right,
          bottom,
        }
      } else {
        merged.push({
          id: current.id,
          label: current.label,
          rect: { ...current.rect },
        })
        current = r
      }
    }

    if (current) {
      merged.push({
        id: current.id,
        label: current.label,
        rect: { ...current.rect },
      })
    }
  }

  yield [...merged, ...passthrough]
}
