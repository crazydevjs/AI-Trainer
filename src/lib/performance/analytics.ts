// Performance Score computation — pure functions, no I/O. Conservative,
// first-pass heuristic weighting (same tuning stance as Phases 4-6): these
// are not fitted to real historical data yet. See ALGORITHM.md "Known
// limitations".

import type { PerformanceEngineSessionInput, PerformanceScores, SessionFormSummary } from "./types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function computeSessionScores(input: PerformanceEngineSessionInput): PerformanceScores {
  const techniqueScore = input.formAnalysis?.scores.technique ?? null;
  const consistencyScore = input.movementAnalysis?.consistency.consistencyScore ?? null;

  const completionRatio = input.targetReps > 0 ? input.totalReps / input.targetReps : 1;
  const volumeScore = clamp(completionRatio * 100);

  const strengthScore = input.weightKg && input.weightKg > 0 ? clamp(50 + completionRatio * 50) : null;

  const recoveryScore = input.riskAnalysis
    ? clamp(100 - input.riskAnalysis.averageRisk)
    : input.restSecondsBeforeSet != null
      ? clamp((input.restSecondsBeforeSet / 90) * 100)
      : null;

  const exerciseParts = [techniqueScore, consistencyScore, volumeScore, strengthScore].filter(
    (n): n is number => n != null
  );
  const exerciseScore = exerciseParts.length
    ? Math.round(exerciseParts.reduce((a, b) => a + b, 0) / exerciseParts.length)
    : Math.round(volumeScore);

  // At the single-exercise level, workoutScore mirrors exerciseScore — the
  // whole-workout aggregate (multiple exercises) is computed separately,
  // once every exercise in a WorkoutLog has been scored (see
  // performance-engine.ts's saveWorkoutSnapshot()).
  const workoutScore = exerciseScore;

  const overallParts = [
    techniqueScore,
    consistencyScore,
    strengthScore,
    recoveryScore,
    volumeScore,
    exerciseScore,
  ].filter((n): n is number => n != null);
  const overallScore = Math.round(overallParts.reduce((a, b) => a + b, 0) / overallParts.length);

  return {
    workoutScore,
    exerciseScore,
    consistencyScore,
    techniqueScore,
    strengthScore,
    recoveryScore,
    volumeScore,
    overallScore,
  };
}

export function computeWorkoutScore(exerciseScores: number[]): number {
  if (!exerciseScores.length) return 0;
  return Math.round(exerciseScores.reduce((a, b) => a + b, 0) / exerciseScores.length);
}

const PERFECT_REP_SCORE_THRESHOLD = 90;

export function countPerfectReps(formAnalysis: SessionFormSummary | null): number {
  if (!formAnalysis) return 0;
  return formAnalysis.reps.filter((r) => r.issues.length === 0 && r.scores.overall >= PERFECT_REP_SCORE_THRESHOLD)
    .length;
}

export function isPerfectSession(scores: PerformanceScores, formAnalysis: SessionFormSummary | null): boolean {
  if (scores.overallScore < 90) return false;
  if (!formAnalysis) return true;
  return !formAnalysis.issueLog.some((e) => e.severity === "major" || e.severity === "critical");
}
