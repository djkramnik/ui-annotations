export function hasIntersection(arr1: any[], arr2: any[]) {
  const set2 = new Set(arr2)
  return arr1.some(element => set2.has(element))
}

export function hasText(el: HTMLElement) {
  return (el.textContent?.replaceAll(/\s+/g, '') ?? '').length > 0
}

export function isInViewport({
  target,
  partial
}: {
  target: Element
  partial?: boolean
}) {
  const {
    bottom,
    right,
    top,
    left,
  } = target.getBoundingClientRect();

  if (partial) {
    return (
      bottom >= 0 &&
      right  >= 0 &&
      top    <= (window.innerHeight || document.documentElement.clientHeight) &&
      left   <= (window.innerWidth  || document.documentElement.clientWidth)
    );
  }

  return (
    top    >= 0 &&
    left   >= 0 &&
    bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    right  <= (window.innerWidth  || document.documentElement.clientWidth)
  );
}

// does not return self
export function getSibs(target: HTMLElement): HTMLElement[] {
  if (!target.parentElement) {
    return []
  }
  return getLegitimizedChildren(target.parentElement)
    .filter(el => el !== target)
}

// excludes target from return array
export function getCousins({
  target,
  distance,
}: {
  target: HTMLElement
  distance: number
}): HTMLElement[] {
  const fallback = [ target ]
  if (distance <= 0) {
    console.log('what the hell')
    return fallback
  }
  if (distance < 2) {
    console.log('warning: you should have called getSibs instead')
    return getSibs(target)
  }
  const { ancestor: grandMa, breadcrumbs } = traverseUp({
    origin: target,
    distance,
    breadcrumbs: []
  })

  if (!grandMa) {
    console.warn('missing grandparent for cousins')
    return fallback
  }

  const aunts = getLegitimizedChildren(grandMa)

  const reverseCrumbs = breadcrumbs!.slice(0, -1).reverse()

  return aunts.map(auntie => {
    return traverseDown({ origin: auntie, indexes: reverseCrumbs })
  }).filter(couz => couz instanceof HTMLElement && couz !== target) as HTMLElement[]
}

// will split list into len equalish parts.  Any remainder gets tacked on the end
export function splitArray<T>({
  list,
  len,
}: {
  list: T[]
  len: number
}): Array<T[]> {
  const chunk = Math.floor(list.length / len)

  return Array(len).fill(null).reduce((acc, _, index) => {
    return acc.concat([
      list.slice(
        index * chunk,
        index + 1 < len
          ? (index * chunk) + chunk
          : undefined
      )]
    )
  }, [])
}

export function snooze(ms?: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms ?? 16))
}

export function getBoundingBoxOfText(element: HTMLElement): DOMRect {
  const node = Array.from(element.childNodes).find(n => n.nodeType === Node.TEXT_NODE)
  if (!node) {
    console.warn("could not find text node within element.  falling back to element bbox", element)
    return element.getBoundingClientRect()
  }
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

export function uuidv4() {
  return crypto.randomUUID()
}

function getLegitimizedChildren(parent: HTMLElement): HTMLElement[] {
  return Array.from(parent.children).filter(el => el instanceof HTMLElement)
}

// another version of this sits in contentScript but it has some non reusable shit in there
// breadcrumbs saves the index of the element at each step so we may later
// traverse down by the same path..
function traverseUp({
  origin,
  distance,
  breadcrumbs,
}: {
  origin: HTMLElement
  distance: number
  breadcrumbs?: number[]
}): {
  ancestor: HTMLElement | null
  breadcrumbs?: number[]
 } {
  if (distance <= 0) {
    return { ancestor: origin, breadcrumbs }
  }
  if (!origin.parentElement) {
    return { ancestor: null, breadcrumbs }
  }
  return traverseUp({
    origin: origin.parentElement,
    distance: distance - 1,
    breadcrumbs: breadcrumbs
      ? breadcrumbs.concat([getLegitimizedChildren(origin.parentElement).indexOf(origin)])
      : undefined
  })
}

function traverseDown({
  origin,
  indexes,
}: {
  origin: HTMLElement,
  indexes: number[]
}): HTMLElement | null {
  if (indexes.length < 1) {
    return origin
  }
  const next = getLegitimizedChildren(origin)[indexes[0]]
  if (!next) {
    return null
  }
  return traverseDown({ origin: next, indexes: indexes.slice(1) })
}