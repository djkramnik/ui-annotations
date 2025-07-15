import { SimilarUiOptions } from "./types";

function hasIntersection(arr1: any[], arr2: any[]) {
  const set2 = new Set(arr2)
  return arr1.some(element => set2.has(element))
}

export const findSimilarUi = (
  options: SimilarUiOptions,
  target: HTMLElement,
): HTMLElement[] => {
  const {
    matchTag = true,
    matchClass,
    exact,
    tolerance,
    max,
    keys,
  } = options
  const targetStyle = window.getComputedStyle(target)

  return Array.from(document.querySelectorAll(
    matchTag ? target.tagName : '*'
  )).filter(c => {
    if (!(c instanceof HTMLElement)) {
      return false
    }
    if (matchClass && !exact) {
      if (exact && c.className !== target.className) {
        return false
      }
      if (target.classList.length > 0 &&
          !hasIntersection(Array.from(c.classList), Array.from(target.classList))) {
        return false
      }
    }
    if (!isInViewport({ target: c})) {
      return false
    }

    let slack = Math.abs(tolerance ?? 0)
    const candidateStyle = window.getComputedStyle(c)

    return keys.every(k => {
      const match = (candidateStyle.getPropertyValue(k) === targetStyle.getPropertyValue(k)) || ((--slack) >= 0)
      return match
    })
  }).slice(0, max ?? 100) as HTMLElement[]
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

export function getSibs(target: HTMLElement): HTMLElement[] {
  if (!target.parentElement) {
    return [ target ]
  }
  return getLegitimizedChildren(target.parentElement)
}

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
  }).filter(couz => couz instanceof HTMLElement)
}