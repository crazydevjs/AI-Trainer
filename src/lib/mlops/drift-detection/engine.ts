import type { LabeledSession } from "@/lib/validation/dataset";
import { buildCategoricalSnapshot, buildContinuousSnapshot } from "./snapshot";
import { CATEGORICAL_DIMENSIONS, CONTINUOUS_DIMENSIONS, extractCategorical, extractContinuous } from "./extract";
import type { CategoricalSnapshot, ContinuousSnapshot, DriftDimension, DriftReport, DriftSeverity } from "./types";

/** Population Stability Index — the standard categorical-distribution
 *  drift metric: PSI < 0.1 no meaningful shift, 0.1-0.25 moderate,
 *  > 0.25 significant (conventional thresholds, not tuned on this app's
 *  own data yet). Missing categories are floored to a small epsilon
 *  rather than 0 so a category disappearing entirely doesn't produce
 *  `log(0)`. */
function psi(baseline: CategoricalSnapshot, current: CategoricalSnapshot): number {
  const categories = new Set([...Object.keys(baseline.counts), ...Object.keys(current.counts)]);
  const EPS = 1e-6;
  let score = 0;
  for (const category of categories) {
    const b = Math.max((baseline.counts[category] ?? 0) / Math.max(baseline.total, 1), EPS);
    const c = Math.max((current.counts[category] ?? 0) / Math.max(current.total, 1), EPS);
    score += (c - b) * Math.log(c / b);
  }
  return score;
}

function psiSeverity(score: number): DriftSeverity {
  if (score >= 0.25) return "significant";
  if (score >= 0.1) return "moderate";
  return "none";
}

/** Continuous dimensions use a simpler normalized-mean-shift check
 *  (|Δmean| in units of the baseline's own stddev) rather than a full
 *  two-sample statistical test — a deliberately simple first pass, see
 *  ALGORITHM.md "Known limitations". */
function meanShift(baseline: ContinuousSnapshot, current: ContinuousSnapshot): number {
  const spread = baseline.stddev || 1;
  return Math.abs(current.mean - baseline.mean) / spread;
}

function meanShiftSeverity(score: number): DriftSeverity {
  if (score >= 2) return "significant";
  if (score >= 1) return "moderate";
  return "none";
}

export function detectDrift(
  baselineSessions: LabeledSession[],
  currentSessions: LabeledSession[],
  dimension: DriftDimension,
): DriftReport {
  if (CATEGORICAL_DIMENSIONS.includes(dimension)) {
    const baseline = buildCategoricalSnapshot(extractCategorical(baselineSessions, dimension));
    const current = buildCategoricalSnapshot(extractCategorical(currentSessions, dimension));
    const driftScore = psi(baseline, current);
    return { dimension, baseline, current, driftScore, severity: psiSeverity(driftScore), method: "psi" };
  }

  const baseline = buildContinuousSnapshot(extractContinuous(baselineSessions, dimension));
  const current = buildContinuousSnapshot(extractContinuous(currentSessions, dimension));
  const driftScore = meanShift(baseline, current);
  return { dimension, baseline, current, driftScore, severity: meanShiftSeverity(driftScore), method: "mean-shift" };
}

export function detectAllDrift(baselineSessions: LabeledSession[], currentSessions: LabeledSession[]): DriftReport[] {
  return [...CATEGORICAL_DIMENSIONS, ...CONTINUOUS_DIMENSIONS].map((dimension) =>
    detectDrift(baselineSessions, currentSessions, dimension),
  );
}
