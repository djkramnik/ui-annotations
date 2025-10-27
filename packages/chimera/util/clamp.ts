export const getClamp = (min: number, max: number) => {
  return function clamp(n: number) {
    return Math.max(min, Math.min(n, max))
  }
}