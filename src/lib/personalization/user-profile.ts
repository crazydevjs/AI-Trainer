// UserLearningProfile read/update — shapes the raw Prisma row into
// UserLearningProfileResult for the read API.

import { getOrCreateLearningProfile, type LearningProfilePatch, updateLearningProfile } from "./personalization-store";
import type { ProgressTrend, UserLearningProfileResult } from "./types";

export async function getUserProfile(userId: string): Promise<UserLearningProfileResult> {
  const row = await getOrCreateLearningProfile(userId);
  return shapeProfile(row);
}

export async function applyProfilePatch(
  userId: string,
  patch: LearningProfilePatch
): Promise<UserLearningProfileResult> {
  const row = await updateLearningProfile(userId, patch);
  return shapeProfile(row);
}

function shapeProfile(row: Awaited<ReturnType<typeof getOrCreateLearningProfile>>): UserLearningProfileResult {
  return {
    experienceLevel: row.experienceLevel,
    favoriteExercises: row.favoriteExercises,
    weakestMovements: row.weakestMovements,
    strongestMovements: row.strongestMovements,
    preferredVolumeSets: row.preferredVolumeSets,
    trainingFrequencyPerWeek: row.trainingFrequencyPerWeek,
    fatigueProfile: row.fatigueProfile,
    consistencyProfile: row.consistencyProfile as ProgressTrend | null,
    injuryRiskTendency: row.injuryRiskTendency as "low" | "moderate" | "elevated" | null,
    coachingPreference: row.coachingPreference,
    confidenceTrend: row.confidenceTrend as ProgressTrend | null,
    movementQualityTrend: row.movementQualityTrend as ProgressTrend | null,
    learningConfidence: row.learningConfidence,
    sessionsAnalyzed: row.sessionsAnalyzed,
  };
}
