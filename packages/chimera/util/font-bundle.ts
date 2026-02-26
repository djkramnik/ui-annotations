export type FontManifest = {
  selectedFamilies?: string[]
  fonts?: Array<{ family: string }>
}

export type RandomFontBundle = {
  id: number
  slug: string | null
  family: string
  cssText: string
  manifest: FontManifest
}

type RandomBundleResponse = {
  data?: {
    bundle?: RandomFontBundle
  }
}

let randomBundlePromise: Promise<RandomFontBundle | null> | null = null
let randomBundleCached: RandomFontBundle | null = null

export async function loadRandomFontBundle(): Promise<RandomFontBundle | null> {
  if (randomBundleCached) {
    return randomBundleCached
  }

  if (!randomBundlePromise) {
    randomBundlePromise = fetch('/api/fonts/random', { cache: 'no-store' })
      .then(async function toBundle(response) {
        if (!response.ok) {
          return null
        }
        const payload = (await response.json()) as RandomBundleResponse
        return payload.data?.bundle || null
      })
      .catch(function onError() {
        return null
      })
      .then(function cacheBundle(bundle) {
        randomBundleCached = bundle
        return bundle
      })
      .finally(function clearPromise() {
        randomBundlePromise = null
      })
  }

  return randomBundlePromise
}

export function loadInlineFontBundleStyles(cssText: string): void {
  if (typeof document === 'undefined') {
    return
  }

  const elementId = 'chimera-font-bundle-css'
  const existing = document.getElementById(elementId)
  if (existing) {
    existing.textContent = cssText
    return
  }

  const style = document.createElement('style')
  style.id = elementId
  style.textContent = cssText
  document.head.appendChild(style)
}

export function applyPreferredFamily(
  manifest: FontManifest | null,
  preferredFamily: string,
): FontManifest | undefined {
  const selected = manifest?.selectedFamilies || []
  const merged = [preferredFamily, ...selected.filter((value) => value !== preferredFamily)]

  return {
    ...(manifest || {}),
    selectedFamilies: merged,
  }
}
