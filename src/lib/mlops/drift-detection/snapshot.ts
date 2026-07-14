import { mean, stddev } from "@/lib/validation/statistics";
import type { CategoricalSnapshot, ContinuousSnapshot } from "./types";

export function buildCategoricalSnapshot(values: (string | undefined)[]): CategoricalSnapshot {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const value of values) {
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
    total++;
  }
  return { kind: "categorical", counts, total };
}

export function buildContinuousSnapshot(values: number[]): ContinuousSnapshot {
  return { kind: "continuous", mean: mean(values), stddev: stddev(values), sampleCount: values.length };
}
