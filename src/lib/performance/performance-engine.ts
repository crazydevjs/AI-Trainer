// Orchestrator — the one integration surface API routes call. No per-frame
// state (unlike the pose engines): this is a plain async pipeline invoked
// once per completed session, entirely after the workout ends. See
// ALGORITHM.md "Performance Intelligence & Persistence Layer".

import { computeSessionScores, countPerfectReps, isPerfectSession } from "./analytics";
import { detectAndAwardAchievements } from "./achievements";
import { computeProgress } from "./progress";
import { updatePersonalBests } from "./personal-best";
import {
  getUserStatistics,
  saveFormAnalysis,
  saveMovementAnalysis,
  saveRiskAnalysis,
  saveSnapshot,
  upsertUserStatistics,
} from "./performance-store";
import { updateTrendHistory } from "./trend-analysis";
import { updateWeaknessHistory } from "./weakness-tracker";
import type { PerformanceEngineResult, PerformanceEngineSessionInput } from "./types";

export async function runSessionPerformanceEngine(
  input: PerformanceEngineSessionInput
): Promise<PerformanceEngineResult> {
  if (input.formAnalysis) await saveFormAnalysis(input.workoutSessionId, input.formAnalysis);
  if (input.movementAnalysis) await saveMovementAnalysis(input.workoutSessionId, input.movementAnalysis);
  if (input.riskAnalysis) await saveRiskAnalysis(input.workoutSessionId, input.riskAnalysis);

  const scores = computeSessionScores(input);
  await saveSnapshot({
    userId: input.userId,
    workoutSessionId: input.workoutSessionId,
    exerciseId: input.exerciseId,
    scores,
  });

  const weaknesses = await updateWeaknessHistory(input);
  const newPersonalBests = await updatePersonalBests(input, scores);

  const prevStats = await getUserStatistics(input.userId);
  const perfectReps = countPerfectReps(input.formAnalysis);
  const perfect = isPerfectSession(scores, input.formAnalysis);
  const sessionsAnalyzed = (prevStats?.sessionsAnalyzed ?? 0) + 1;

  const rollingAvg = (prev: number | null | undefined, next: number) =>
    Math.round(((prev ?? next) * (sessionsAnalyzed - 1) + next) / sessionsAnalyzed);

  const consistencyStreak = perfect ? (prevStats?.consistencyStreak ?? 0) + 1 : 0;

  await upsertUserStatistics(input.userId, {
    sessionsAnalyzed,
    avgPerformanceScore: rollingAvg(prevStats?.avgPerformanceScore, scores.overallScore),
    avgTechniqueScore: rollingAvg(prevStats?.avgTechniqueScore, scores.techniqueScore ?? scores.overallScore),
    bestPerformanceScore: Math.max(prevStats?.bestPerformanceScore ?? 0, scores.overallScore),
    totalPerfectReps: (prevStats?.totalPerfectReps ?? 0) + perfectReps,
    totalPerfectSessions: (prevStats?.totalPerfectSessions ?? 0) + (perfect ? 1 : 0),
    consistencyStreak,
    longestConsistencyStreak: Math.max(prevStats?.longestConsistencyStreak ?? 0, consistencyStreak),
    lastAnalyzedAt: new Date(),
  });

  const newAchievements = await detectAndAwardAchievements(input, newPersonalBests);

  await updateTrendHistory(input.userId, input.exerciseId);
  await updateTrendHistory(input.userId, null);

  const [exerciseProgress, overallProgress] = await Promise.all([
    computeProgress(input.userId, input.exerciseId),
    computeProgress(input.userId, null),
  ]);

  return {
    scores,
    newPersonalBests,
    newAchievements,
    weaknesses,
    exerciseProgress,
    overallProgress,
    historyCount: sessionsAnalyzed,
  };
}

/** Whole-workout (multi-exercise) rollup — call once after every exercise
 *  in a WorkoutLog has already gone through runSessionPerformanceEngine(). */
export async function saveWorkoutSnapshot(input: {
  userId: string;
  workoutLogId: string;
  exerciseScores: number[];
}) {
  const overallScore = input.exerciseScores.length
    ? Math.round(input.exerciseScores.reduce((a, b) => a + b, 0) / input.exerciseScores.length)
    : 0;
  return saveSnapshot({
    userId: input.userId,
    workoutLogId: input.workoutLogId,
    scores: {
      workoutScore: overallScore,
      exerciseScore: null,
      consistencyScore: null,
      techniqueScore: null,
      strengthScore: null,
      recoveryScore: null,
      volumeScore: null,
      overallScore,
    },
  });
}
