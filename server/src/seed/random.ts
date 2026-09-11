export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick() called with an empty list');
  return item;
}

export function cumulative(weights: readonly number[]): number[] {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let acc = 0;
  return weights.map((w) => (acc += w / total));
}

export function pickWeightedIndex(rng: Rng, cdf: readonly number[]): number {
  const r = rng();
  let lo = 0;
  let hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((cdf[mid] ?? 1) > r) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function pickDistinctWeighted<T>(
  rng: Rng,
  items: readonly T[],
  weights: readonly number[],
  k: number,
): T[] {
  const remainingItems = [...items];
  const remainingWeights = [...weights];
  const result: T[] = [];
  while (result.length < k && remainingItems.length > 0) {
    const index = pickWeightedIndex(rng, cumulative(remainingWeights));
    const item = remainingItems[index];
    if (item === undefined) break;
    result.push(item);
    remainingItems.splice(index, 1);
    remainingWeights.splice(index, 1);
  }
  return result;
}

export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
