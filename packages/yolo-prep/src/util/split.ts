/* =========================
   PRNG + shuffle (deterministic)
   ========================= */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleInPlace<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

type TrainTestOptions = Partial<{
  fraction?: number
  seed?: number
}>

export type TrainTestSplit = {
  train: number[]
  test: number[]
}

export function trainTestSplit(
  ids: number[],
  options: TrainTestOptions = {}): TrainTestSplit {
  const RNG_SEED = options.seed ?? 42
  const TRAIN_FRACTION = options.fraction ?? 0.85
  const rng = mulberry32(RNG_SEED)
  shuffleInPlace(ids, rng)

  const breakIndex = Math.max(1, Math.floor(ids.length * TRAIN_FRACTION))
  return {
    train: ids.slice(0, breakIndex),
    test: ids.slice(breakIndex)
  }
}
