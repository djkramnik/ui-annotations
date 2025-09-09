/// <reference lib="dom" />

export function getHnHrefs() {
  return Array.from(
    document.querySelectorAll('.submission .titleline a')
  ).map(a => (a as HTMLAnchorElement).href)
}