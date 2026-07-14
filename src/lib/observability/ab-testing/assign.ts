import type { ExperimentVariant } from "./types";

/** Same deterministic-hash-bucketing approach as Phase 11's feature-flags
 *  engine (same user always lands in the same bucket for a given
 *  experiment key) — generalized to N weighted variants instead of a
 *  single on/off percentage. Not cryptographic; doesn't need to be. */
function bucketOf(key: string, range: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(hash) % range;
}

export function assignVariant(experimentKey: string, userId: string, variants: ExperimentVariant[]): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0 || variants.length === 0) return variants[0]?.name ?? "control";

  const point = bucketOf(`${experimentKey}:${userId}`, totalWeight);
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (point < cumulative) return variant.name;
  }
  return variants[variants.length - 1].name;
}
