// Personalized threshold computation. Never touches or overrides any
// code-owned default (REP_TUNING, form-engine bands, etc. stay exactly as
// they are) — this only produces a separate, additive AdaptiveThreshold
// row a downstream system could *optionally* read later. `defaultValueRef`
// is a descriptive reference point (this user's own historical median),
// not a copy of any protected file's constant.

import {
  getCompensationEventCounts,
  getFormAnalysisSeries,
  getMovementAnalysisSeries,
  getRiskScoreSeries,
  getTempoScores,
  listAdaptiveThresholds,
} from "./personalization-store";
import type { AdaptiveThresholdResult } from "./types";

const MIN_SAMPLES = 5;

/** For "higher is better" scores (ROM, symmetry, consistency, stability):
 *  the personalized floor is this user's own 25th percentile — "on a
 *  below-average day, they still typically clear this." For "lower is
 *  better" (fatigue/risk, compensation event count): the personalized
 *  ceiling is their 75th percentile. */
type Direction = "higherIsBetter" | "lowerIsBetter";

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

function computeFromSeries(values: number[], direction: Direction): { value: number; median: number } | null {
  if (values.length < MIN_SAMPLES) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const value = direction === "higherIsBetter" ? percentile(sorted, 0.25) : percentile(sorted, 0.75);
  return { value: Math.round(value * 10) / 10, median: Math.round(median * 10) / 10 };
}

interface ThresholdSource {
  type: string;
  direction: Direction;
  fetch: (userId: string, exerciseId: string | null) => Promise<number[]>;
}

const SOURCES: ThresholdSource[] = [
  { type: "rom", direction: "higherIsBetter", fetch: (u, e) => getFormAnalysisSeries(u, e, "romScore") },
  // Same underlying signal as "rom" — a named alias matching the spec's
  // example list, generically computed (not squat-specific detection).
  { type: "squatDepth", direction: "higherIsBetter", fetch: (u, e) => getFormAnalysisSeries(u, e, "romScore") },
  { type: "tempo", direction: "higherIsBetter", fetch: getTempoScores },
  { type: "symmetry", direction: "higherIsBetter", fetch: (u, e) => getMovementAnalysisSeries(u, e, "symmetryScore") },
  {
    type: "consistency",
    direction: "higherIsBetter",
    fetch: (u, e) => getMovementAnalysisSeries(u, e, "consistencyScore"),
  },
  {
    type: "instability",
    direction: "higherIsBetter",
    fetch: (u, e) => getMovementAnalysisSeries(u, e, "stabilityScore"),
  },
  // velocityLoss has no persisted score of its own — smoothness is the
  // closest available proxy (jerk/smoothness relates to velocity
  // consistency). See ALGORITHM.md "Known limitations".
  {
    type: "velocityLoss",
    direction: "higherIsBetter",
    fetch: (u, e) => getMovementAnalysisSeries(u, e, "smoothnessScore"),
  },
  { type: "fatigue", direction: "lowerIsBetter", fetch: getRiskScoreSeries },
  { type: "compensation", direction: "lowerIsBetter", fetch: getCompensationEventCounts },
];

export async function computeAdaptiveThresholds(
  userId: string,
  exerciseId: string | null
): Promise<{ type: string; value: number; defaultRef: number; sampleSize: number }[]> {
  const out: { type: string; value: number; defaultRef: number; sampleSize: number }[] = [];
  for (const source of SOURCES) {
    const values = await source.fetch(userId, exerciseId);
    const result = computeFromSeries(values, source.direction);
    if (!result) continue;
    out.push({ type: source.type, value: result.value, defaultRef: result.median, sampleSize: values.length });
  }
  return out;
}

export async function getAdaptiveThresholds(userId: string, exerciseId?: string): Promise<AdaptiveThresholdResult[]> {
  const rows = await listAdaptiveThresholds(userId, exerciseId);
  return rows.map(toResult);
}

export function toResult(row: {
  thresholdType: string;
  exerciseId: string | null;
  personalizedValue: number;
  defaultValueRef: number | null;
  confidence: number;
  sampleSize: number;
}): AdaptiveThresholdResult {
  return {
    thresholdType: row.thresholdType,
    exerciseId: row.exerciseId,
    personalizedValue: row.personalizedValue,
    defaultValueRef: row.defaultValueRef,
    confidence: row.confidence,
    sampleSize: row.sampleSize,
  };
}
