// Per-exercise aggregation — frequency and average scores across a user's
// workout history, feeding learning-engine.ts's favorite/weakest/strongest
// classification. Reuses Phase 7's already-shaped getWorkoutHistory()
// rather than re-querying WorkoutSession directly.

import { getWorkoutHistory } from "@/lib/performance";

export interface ExerciseAggregate {
  exerciseId: string;
  exerciseName: string;
  frequency: number;
  avgScore: number;
}

export async function computeExerciseAggregates(userId: string): Promise<ExerciseAggregate[]> {
  const history = await getWorkoutHistory(userId);
  const byExercise = new Map<string, { name: string; scores: number[] }>();

  for (const entry of history) {
    const score = entry.performanceScore ?? entry.overallScore;
    if (score == null) continue;
    const bucket = byExercise.get(entry.exerciseId) ?? { name: entry.exerciseName, scores: [] };
    bucket.scores.push(score);
    byExercise.set(entry.exerciseId, bucket);
  }

  return Array.from(byExercise.entries()).map(([exerciseId, { name, scores }]) => ({
    exerciseId,
    exerciseName: name,
    frequency: scores.length,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));
}

export function topByFrequency(aggregates: ExerciseAggregate[], n = 3): string[] {
  return [...aggregates]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, n)
    .map((a) => a.exerciseId);
}

export function lowestScoring(aggregates: ExerciseAggregate[], n = 3, minSamples = 2): string[] {
  return [...aggregates]
    .filter((a) => a.frequency >= minSamples)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, n)
    .map((a) => a.exerciseId);
}

export function highestScoring(aggregates: ExerciseAggregate[], n = 3, minSamples = 2): string[] {
  return [...aggregates]
    .filter((a) => a.frequency >= minSamples)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, n)
    .map((a) => a.exerciseId);
}
