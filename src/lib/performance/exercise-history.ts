// Per-exercise historical aggregation — shapes raw WorkoutSession rows for
// one exercise into the ExerciseHistoryEntry[] the read API returns.

import { queryExerciseHistory } from "./performance-store";
import type { ExerciseHistoryEntry } from "./types";

export async function getExerciseHistoryEntries(
  userId: string,
  exerciseId: string
): Promise<ExerciseHistoryEntry[]> {
  const rows = await queryExerciseHistory(userId, exerciseId);
  return rows.map((r) => ({
    workoutSessionId: r.id,
    startedAt: r.startedAt,
    overallScore: r.overallScore,
    performanceScore: r.performanceSnapshot?.overallScore ?? null,
    weightKg: r.sets.reduce((max: number | null, s) => (s.weightKg != null && (max == null || s.weightKg > max) ? s.weightKg : max), null),
    totalReps: r.totalReps,
  }));
}
