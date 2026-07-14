// Personal Best Engine — compares this session's numbers against the 9
// tracked categories and upserts whichever ones were just beaten. Distinct
// from (and doesn't touch) the existing PersonalRecord model, which only
// tracks weight+reps for the gamification/PR-badge flow — see
// ALGORITHM.md "Critical naming collision, resolved".

import { PersonalBestCategory } from "@prisma/client";
import { findPersonalBest, writePersonalBest } from "./performance-store";
import type { PerformanceEngineSessionInput, PerformanceScores, PersonalBestUpdate } from "./types";

interface Candidate {
  category: PersonalBestCategory;
  value: number | null;
  exerciseId: string | null;
}

export async function updatePersonalBests(
  input: PerformanceEngineSessionInput,
  scores: PerformanceScores
): Promise<PersonalBestUpdate[]> {
  const candidates: Candidate[] = [
    { category: PersonalBestCategory.HIGHEST_WEIGHT, value: input.weightKg, exerciseId: input.exerciseId },
    { category: PersonalBestCategory.MOST_REPS, value: input.totalReps, exerciseId: input.exerciseId },
    {
      category: PersonalBestCategory.MOST_VOLUME,
      value: input.weightKg ? input.weightKg * input.totalReps : null,
      exerciseId: input.exerciseId,
    },
    { category: PersonalBestCategory.LONGEST_WORKOUT, value: input.durationSec, exerciseId: null },
    {
      category: PersonalBestCategory.BEST_TECHNIQUE,
      value: input.formAnalysis?.scores.technique ?? null,
      exerciseId: input.exerciseId,
    },
    {
      category: PersonalBestCategory.BEST_CONSISTENCY,
      value: input.movementAnalysis?.consistency.consistencyScore ?? null,
      exerciseId: input.exerciseId,
    },
    {
      category: PersonalBestCategory.BEST_SYMMETRY,
      value: input.movementAnalysis?.scores.symmetry ?? null,
      exerciseId: input.exerciseId,
    },
    {
      category: PersonalBestCategory.BEST_MOVEMENT_SCORE,
      value: input.movementAnalysis?.scores.overall ?? null,
      exerciseId: input.exerciseId,
    },
    { category: PersonalBestCategory.BEST_PERFORMANCE_SCORE, value: scores.overallScore, exerciseId: null },
  ];

  const results: PersonalBestUpdate[] = [];
  for (const c of candidates) {
    if (c.value == null || c.value <= 0) continue;
    const existing = await findPersonalBest(input.userId, c.exerciseId, c.category);
    const isNewBest = !existing || c.value > existing.value;
    if (isNewBest) {
      await writePersonalBest({
        userId: input.userId,
        exerciseId: c.exerciseId,
        category: c.category,
        value: c.value,
        workoutSessionId: input.workoutSessionId,
        existingId: existing?.id,
      });
    }
    if (isNewBest) {
      results.push({ category: c.category, value: c.value, isNewBest, previousValue: existing?.value ?? null });
    }
  }
  return results;
}
