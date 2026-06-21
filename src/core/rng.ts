// Deterministic pseudo-random number generator. A fixed seed makes every
// data generation run produce byte-identical output, so the committed
// fixtures stay reproducible.

export type Rng = () => number

/** mulberry32: tiny, fast, good-enough PRNG returning a float in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fixed seed shared by the generator so output never drifts. */
export const DEFAULT_SEED = 0x46_42_72_67 // "FBrg"

export function createRng(seed: number = DEFAULT_SEED): Rng {
  return mulberry32(seed)
}

/** Float in [min, max). */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng()
}

/** Integer in [min, max] inclusive (rng() is in [0, 1), so max is reachable). */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(min + (max - min + 1) * rng())
}
