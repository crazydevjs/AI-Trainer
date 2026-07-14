// Heuristic/statistical progress prediction — plain linear-regression-style
// trend extrapolation over this user's own history. No LLM, no external
// model, per spec. Every output carries a confidence value and is phrased
// as an estimate, not a guarantee.

import { getPerformanceTrend } from "@/lib/performance";
import { estimateExpectedRecoveryHours } from "./fatigue-learning";
import { getLatestPrediction, getWeightHistory } from "./personalization-store";
import type { ProgressPredictionResult } from "./types";

const MIN_WEIGHT_SAMPLES = 5;
const PROJECTION_WEEKS = 4;

/** Ordinary least-squares slope of maxWeightKg over session index (not
 *  calendar time — sessions aren't evenly spaced, and index-based slope is
 *  a simpler, honestly-cruder estimate of "kg gained per session"). */
function linearSlope(values: number[]): number {
  const n = values.length;
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export async function predictProgress(
  userId: string,
  exerciseId: string | null
): Promise<Omit<ProgressPredictionResult, "createdAt">> {
  const [trend, recoveryHours] = await Promise.all([
    getPerformanceTrend(userId, exerciseId),
    estimateExpectedRecoveryHours(userId),
  ]);

  const expectedImprovementPct = trend?.improvementPct ?? null;
  const plateauProbability =
    trend?.thirtyDayTrend === "plateau" ? 0.75 : trend?.thirtyDayTrend === "stable" ? 0.4 : 0.15;

  let estimatedNextPrValue: number | null = null;
  let estimatedNextPrDate: Date | null = null;
  let predictionConfidence = trend ? Math.min(1, trend.sessionsAnalyzed / 20) : 0;

  if (exerciseId) {
    const history = await getWeightHistory(userId, exerciseId);
    if (history.length >= MIN_WEIGHT_SAMPLES) {
      const weights = history.map((h) => h.maxWeightKg);
      const slope = linearSlope(weights);
      const current = weights[weights.length - 1];
      if (slope > 0) {
        estimatedNextPrValue = Math.round((current + slope * PROJECTION_WEEKS) * 10) / 10;
        const avgGapMs =
          (history[history.length - 1].startedAt.getTime() - history[0].startedAt.getTime()) /
          Math.max(1, history.length - 1);
        estimatedNextPrDate = new Date(Date.now() + avgGapMs * PROJECTION_WEEKS);
      }
      predictionConfidence = Math.max(predictionConfidence, Math.min(1, history.length / 15));
    }
  }

  return {
    exerciseId: exerciseId ?? null,
    expectedImprovementPct,
    plateauProbability,
    estimatedNextPrValue,
    estimatedNextPrDate,
    expectedRecoveryHours: recoveryHours,
    predictionConfidence: Math.round(predictionConfidence * 100) / 100,
  };
}

/** Latest already-computed prediction (does not compute a new one — see
 *  runPersonalizationEngine() for that). Returns null if none exists yet. */
export async function getPrediction(
  userId: string,
  exerciseId: string | null = null
): Promise<ProgressPredictionResult | null> {
  const row = await getLatestPrediction(userId, exerciseId);
  if (!row) return null;
  return {
    exerciseId: row.exerciseId,
    expectedImprovementPct: row.expectedImprovementPct,
    plateauProbability: row.plateauProbability,
    estimatedNextPrValue: row.estimatedNextPrValue,
    estimatedNextPrDate: row.estimatedNextPrDate,
    expectedRecoveryHours: row.expectedRecoveryHours,
    predictionConfidence: row.predictionConfidence,
    createdAt: row.createdAt,
  };
}
