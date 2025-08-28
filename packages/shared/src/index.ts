export enum AnnotationLabel {
  button = 'button',
  heading = 'heading',
  input = 'input'
}

export const annotationLabels: Record<AnnotationLabel, string> = {
  button:       '#a8d1d0',
  heading:      '#e3b1e3',
  input: '#e3a1a1',
}

/**
 * text region utility
 */

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


export async function* gatherTextRegions(opts: Partial<{
  batchSize: number
  minSize: number
  includeIFrames: boolean
}>) {
  const batchSize = opts.batchSize ?? 200
  const minSize = opts.minSize ?? 11
  const includeIFrames = opts.includeIFrames ?? false


}
