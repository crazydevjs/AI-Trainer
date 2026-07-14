// The core profile-learning algorithm — infers experience level, favorite/
// weakest/strongest exercises, and consistency profile from history, then
// writes the result to UserLearningProfile via user-profile.ts.

import type { ExperienceLevel } from "@prisma/client";
import { computeExerciseAggregates, highestScoring, lowestScoring, topByFrequency } from "./exercise-profile";
import { getAvgSetsPerSession, getExerciseSessionCount, getOnboardingProfile } from "./personalization-store";
import { classifyProgress, getWorkoutHistory } from "@/lib/performance";
import type { ProgressTrend } from "./types";

const EXPERIENCE_SESSION_THRESHOLDS: [number, ExperienceLevel][] = [
  [80, "ADVANCED"],
  [20, "INTERMEDIATE"],
];

export interface LearnedProfileFields {
  experienceLevel: ExperienceLevel | null;
  favoriteExercises: string[];
  weakestMovements: string[];
  strongestMovements: string[];
  preferredVolumeSets: number | null;
  consistencyProfile: ProgressTrend;
  sessionsAnalyzed: number;
}

export async function learnProfileFields(userId: string): Promise<LearnedProfileFields> {
  const [aggregates, sessionCount, onboarding, history, preferredVolumeSets] = await Promise.all([
    computeExerciseAggregates(userId),
    getExerciseSessionCount(userId),
    getOnboardingProfile(userId),
    getWorkoutHistory(userId),
    getAvgSetsPerSession(userId),
  ]);

  let experienceLevel: ExperienceLevel | null = onboarding?.experience ?? null;
  for (const [threshold, level] of EXPERIENCE_SESSION_THRESHOLDS) {
    if (sessionCount >= threshold) {
      experienceLevel = level;
      break;
    }
  }

  const favoriteExercises = topByFrequency(aggregates);
  const weakestMovements = lowestScoring(aggregates);
  const strongestMovements = highestScoring(aggregates);

  const consistencyProfile = classifyProgress(
    history
      .map((h) => h.performanceScore ?? h.overallScore)
      .filter((n): n is number => n != null)
      .reverse()
  );

  return {
    experienceLevel,
    favoriteExercises,
    weakestMovements,
    strongestMovements,
    preferredVolumeSets,
    consistencyProfile,
    sessionsAnalyzed: sessionCount,
  };
}
