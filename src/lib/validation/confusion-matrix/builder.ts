import type { RepConfusionResult, RepMatch } from "./types";

/** Greedy nearest-timestamp matching (closest pairs first) between
 *  predicted and ground-truth rep timestamps — the 1D analogue of IOU
 *  matching in object-detection evaluation. Unmatched predicted reps are
 *  false positives; unmatched ground-truth reps are false negatives. */
export function buildRepConfusionMatrix(
  predictedMs: number[],
  groundTruthMs: number[],
  toleranceMs = 1500,
): RepConfusionResult {
  const candidates: { p: number; g: number; delta: number }[] = [];
  for (let p = 0; p < predictedMs.length; p++) {
    for (let g = 0; g < groundTruthMs.length; g++) {
      const delta = Math.abs(predictedMs[p] - groundTruthMs[g]);
      if (delta <= toleranceMs) candidates.push({ p, g, delta });
    }
  }
  candidates.sort((a, b) => a.delta - b.delta);

  const usedPredicted = new Set<number>();
  const usedGroundTruth = new Set<number>();
  const matches: RepMatch[] = [];

  for (const { p, g, delta } of candidates) {
    if (usedPredicted.has(p) || usedGroundTruth.has(g)) continue;
    usedPredicted.add(p);
    usedGroundTruth.add(g);
    matches.push({ predictedIndex: p, groundTruthIndex: g, deltaMs: delta });
  }

  for (let p = 0; p < predictedMs.length; p++) {
    if (!usedPredicted.has(p)) matches.push({ predictedIndex: p, groundTruthIndex: null });
  }
  for (let g = 0; g < groundTruthMs.length; g++) {
    if (!usedGroundTruth.has(g)) matches.push({ predictedIndex: null, groundTruthIndex: g });
  }

  return {
    matches,
    truePositives: usedPredicted.size,
    falsePositives: predictedMs.length - usedPredicted.size,
    falseNegatives: groundTruthMs.length - usedGroundTruth.size,
    mode: "timestamp-matched",
  };
}

/** Fallback when ground truth only has a total rep count, not per-rep
 *  timestamps — a coarse approximation (can't say *which* reps were
 *  wrong, only how many), documented as such wherever it's surfaced. */
export function buildCountOnlyConfusion(predictedCount: number, groundTruthCount: number): RepConfusionResult {
  const truePositives = Math.min(predictedCount, groundTruthCount);
  return {
    matches: [],
    truePositives,
    falsePositives: Math.max(0, predictedCount - groundTruthCount),
    falseNegatives: Math.max(0, groundTruthCount - predictedCount),
    mode: "count-only",
  };
}
