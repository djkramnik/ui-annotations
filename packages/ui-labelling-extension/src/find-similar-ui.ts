import { SimilarUiOptions } from "./types";
import { snooze } from './util'

type GeneratorResponse =
  { done: boolean } & (
  | { percentComplete: number }
  | { elements: HTMLElement[] }
)

export async function* findSimilarUiAsync(
  options: SimilarUiOptions,
  target: HTMLElement,
  signal?: AbortSignal
): AsyncGenerator<{percentProcessed: number, done: false}> {
  const {
    matchTag,
    matchClass,
    exact,
    tolerance,
    max,
    keys,
  } = options
  const targetStyle = window.getComputedStyle(target)
}