import { SimilarUiOptions } from "./types";

function hasIntersection(arr1: any[], arr2: any[]) {
  const set2 = new Set(arr2)
  return arr1.some(element => set2.has(element))
}

export const findSimilarUi = (
  options: SimilarUiOptions,
  target: HTMLElement,
  candidates: HTMLElement[]
): HTMLElement[] => {
  const {
    matchTag,
    matchClass,
    exact,
    tolerance,
    max,
    keys,
  } = options
  const targetStyle = window.getComputedStyle(target)

  return candidates.filter(c => {
    if (matchTag && c.tagName !== target.tagName) {
      return false
    }
    if (matchClass) {
      if (exact && c.className !== target.className) {
        return false
      }
      if (target.classList.length > 0 &&
          !hasIntersection(Array.from(c.classList), Array.from(target.classList))) {
        return false
      }
    }
    let slack = Math.abs(tolerance ?? 0)
    const candidateStyle = window.getComputedStyle(c)

    return keys.every(k => {
      const match = (candidateStyle.getPropertyValue(k) === targetStyle.getPropertyValue(k)) || ((--slack) >= 0)
      return match
    })
  }).slice(0, max ?? 20)
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

export function getSibs(target: HTMLElement): HTMLElement[] {
  if (!target.parentElement) {
    return [ target ]
  }
  return Array.from(target.parentElement.children)
    .filter(el => el instanceof HTMLElement)
}