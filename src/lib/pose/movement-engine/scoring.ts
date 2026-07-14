// Per-frame Movement scores. Reuses RollingStat accumulators the caller
// (engine.ts) already maintains from Form Engine's exposed metrics/sway —
// no new pose math. `consistency` is deliberately left neutral (100) here:
// consistency is a multi-rep concept, only meaningful once a session summary
// is built (see consistency.ts) — a single frame has nothing to compare.
//
// Jerk (3rd derivative of the progress signal) amplifies per-frame noise
// heavily; the smoothness formula's scale constant is a conservative
// first-pass guess, not fitted to real data — same tuning stance as the
// Form Engine's exercise-specific thresholds (see ALGORITHM.md).

import type { RollingStat } from "../form-engine/temporal-tracker";
import type { DetectedIssue } from "../form-engine/types";
import { computeStabilityScore, type SwayStats } from "./stability";
import type { MovementScores } from "./types";

const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeFrameMovementScores(input: {
  jerkStat: RollingStat;
  kneeDiffStat: RollingStat;
  elbowDiffStat: RollingStat;
  sway: SwayStats;
  activeIssues: DetectedIssue[];
  recentCompensationCount: number;
}): MovementScores {
  const jerkMean = input.jerkStat.mean;
  const smoothness = clampScore(100 - Math.min(60, Math.abs(jerkMean ?? 0) * 0.02));

  const majorOrCritical = input.activeIssues.filter(
    (i) => i.severity === "major" || i.severity === "critical"
  ).length;
  const control = clampScore(100 - majorOrCritical * 15 - input.recentCompensationCount * 5);

  const kneeStd = input.kneeDiffStat.stdDev;
  const elbowStd = input.elbowDiffStat.stdDev;
  const symmetry = clampScore(100 - ((kneeStd ?? 0) + (elbowStd ?? 0)) * 2);

  const stability = computeStabilityScore(input.sway, input.recentCompensationCount);

  // Coordination/efficiency are composite proxies, not independently
  // measured — joint-synchronization and true movement-efficiency would
  // need multi-joint timing correlation this phase doesn't attempt.
  const coordination = clampScore((smoothness + symmetry) / 2);
  const efficiency = clampScore((smoothness + control) / 2);
  const consistency = 100;

  const overall = clampScore(
    (smoothness + control + coordination + symmetry + consistency + stability + efficiency) / 7
  );

  return { smoothness, control, coordination, symmetry, consistency, stability, efficiency, overall };
}
