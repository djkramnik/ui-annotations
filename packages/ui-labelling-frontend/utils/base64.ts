/**
 * Safely convert an ArrayBuffer → base-64.
 * Works in both browser and Node (SSR) contexts.
 * I don't care - dg
 */
export function toBase64(buf: ArrayBuffer): string {
  // 1. If we’re running in Node (e.g. during SSR) just use Buffer.
  if (typeof Buffer !== 'undefined') {
    // @ts-ignore – Buffer is available at runtime in Node.
    return Buffer.from(buf).toString('base64')
  }

  // 2. Browser fallback – chunked to avoid “Maximum call stack size exceeded”.
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000          // 32 768 – well under the arg-limit safety zone
  let binary = ''

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[]
    )
  }

  return btoa(binary)
}