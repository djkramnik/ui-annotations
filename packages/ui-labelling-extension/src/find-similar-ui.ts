import { SimilarUiOptions } from "./types";
import { hasIntersection, hasText, isInViewport, snooze } from './util'

export type FindSimilarUiResponse = (
  | { percentComplete: number; done: false }
  | { results: HTMLElement[]; done: true }
)

export async function* findSimilarUiAsync(
  options: SimilarUiOptions,
  target: HTMLElement,
  signal?: AbortSignal
): AsyncGenerator<FindSimilarUiResponse> {
  const {
    matchTag,
    matchClass,
    exact,
    tolerance,
    max,
    keys,
  } = options
  const targetStyle = window.getComputedStyle(target)
  const targetHasText = hasText(target)
  const tagSelector = matchTag
    ? target.tagName
    : '*'

  const classSelector = matchClass && exact
    ? `.${Array.from(target.classList).join('.')}`
    : ''

  const nodeList = document.querySelectorAll(`${tagSelector}${classSelector}`)

  const totalCandidates = nodeList.length
  const CHUNK_SIZE = 50
  const results: HTMLElement[] = []
  const maxResults = max ?? Infinity
  let index = 0

  while (index < totalCandidates) {
    if (signal?.aborted) {
      break
    }
    if (results.length >= maxResults) {
      yield { results, done: true }
    }
    const endIndex = Math.min(index + CHUNK_SIZE, nodeList.length)
    for(; index < endIndex; index += 1) {
      const el = nodeList[index] as HTMLElement

      const invalid = !isInViewport({ target: el }) || !(el instanceof HTMLElement)
      if (invalid) {
        continue
      }
      const notMatchingClass = matchClass && !exact && (
        !hasIntersection(Array.from(el.classList), Array.from(target.classList))
      )
      if (notMatchingClass) {
        continue
      }
      let slack = Math.abs(tolerance ?? 0)

      const candidateStyle = window.getComputedStyle(el)
      const pass = keys.every(k => {
        // has to see if this causes issues
        const candidateHasText = hasText(el)
        if (candidateHasText !== targetHasText) {
          return false
        }
        const match = (candidateStyle.getPropertyValue(k) === targetStyle.getPropertyValue(k)) || ((--slack) >= 0)
        return match
      })
      if (pass) {
        results.push(el)
      }
    }

    yield({
      percentComplete: (index / totalCandidates) * 100,
      done: false
    })
    await snooze()
  }

  yield({
    percentComplete: 100,
    done: false
  })
  await snooze()
  yield {
    results,
    done: true
  }
}