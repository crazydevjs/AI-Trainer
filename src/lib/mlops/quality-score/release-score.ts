import type { QualityScoreBreakdown } from "./types";

export interface ReleaseScoreInput {
  macroF1: number; // 0..1
  hasCriticalRegression: boolean;
  datasetQualityScore: number; // 0..1
}

/** First-pass weighting: correctness (F1) dominates, a critical
 *  regression is heavily penalized rather than just subtracted, and
 *  dataset quality contributes a smaller share (a great score against a
 *  thin/unlabeled dataset shouldn't look as good as the same score
 *  against broad, well-labeled coverage). */
export function computeReleaseQualityScore(input: ReleaseScoreInput): QualityScoreBreakdown {
  const f1 = Math.max(0, Math.min(1, input.macroF1));
  const regressionFree = input.hasCriticalRegression ? 0 : 1;
  const datasetQuality = Math.max(0, Math.min(1, input.datasetQualityScore));

  const overall = 0.6 * f1 + 0.2 * regressionFree + 0.2 * datasetQuality;

  return { overall, components: { f1, regressionFree, datasetQuality } };
}
