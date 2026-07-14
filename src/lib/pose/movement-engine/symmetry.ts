// Left/right symmetry — operates only on the dual-sided JointMetrics fields
// the Form Engine already computed (kneeAngleDeg, elbowAngleDeg,
// hipHeightNorm) and on RollingStat/RollingMin accumulators the caller
// (movement-engine/engine.ts) feeds every frame. No pose math here.

import type { RollingMin, RollingStat } from "../form-engine/temporal-tracker";
import type { JointMetrics } from "../form-engine/joint-metrics";
import type { SymmetrySummary } from "./types";

export interface SymmetrySample {
  kneeDiffDeg: number | null;
  elbowDiffDeg: number | null;
  hipDiffNorm: number | null;
}

export function sampleSymmetry(metrics: JointMetrics): SymmetrySample {
  const { left: lk, right: rk } = metrics.kneeAngleDeg;
  const { left: le, right: re } = metrics.elbowAngleDeg;
  const { left: lh, right: rh } = metrics.hipHeightNorm;
  return {
    kneeDiffDeg: lk != null && rk != null ? Math.abs(lk - rk) : null,
    elbowDiffDeg: le != null && re != null ? Math.abs(le - re) : null,
    hipDiffNorm: lh != null && rh != null ? Math.abs(lh - rh) : null,
  };
}

/** 0 diff -> 100; scales down as the typical L/R difference grows. */
function scoreFor(stdDev: number | null, degPerPoint: number): number | null {
  return stdDev == null ? null : Math.max(0, Math.min(100, 100 - stdDev * degPerPoint));
}

export function summarizeSymmetry(
  kneeDiff: RollingStat,
  elbowDiff: RollingStat,
  kneeMin: { left: RollingMin; right: RollingMin },
  elbowMin: { left: RollingMin; right: RollingMin }
): SymmetrySummary {
  const notes: string[] = [];
  const kneeStd = kneeDiff.stdDev;
  const elbowStd = elbowDiff.stdDev;

  const kneeScore = scoreFor(kneeStd, 4);
  const elbowScore = scoreFor(elbowStd, 4);
  const parts = [kneeScore, elbowScore].filter((n): n is number => n != null);
  const symmetryScore = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 100;

  if (kneeStd != null && kneeStd > 6) notes.push("Uneven knee tracking between left and right.");
  if (elbowStd != null && elbowStd > 6) notes.push("Uneven arm path between left and right.");

  // Dominant side: whichever side reaches a deeper (lower-angle) minimum on
  // more of the two tracked joints — a coarse proxy from 2D pose angles,
  // not an EMG/force measurement. See ALGORITHM.md "Known limitations".
  let leftWins = 0;
  let rightWins = 0;
  for (const pair of [kneeMin, elbowMin]) {
    const l = pair.left.min;
    const r = pair.right.min;
    if (l == null || r == null) continue;
    if (l < r - 3) leftWins++;
    else if (r < l - 3) rightWins++;
  }
  const dominantSide = leftWins > rightWins ? "left" : rightWins > leftWins ? "right" : null;
  const asymmetryConfidence = parts.length
    ? Math.round(Math.min(1, parts.length / 2) * (1 - symmetryScore / 100) * 100) / 100
    : 0;

  return { symmetryScore, dominantSide, asymmetryConfidence, notes };
}
