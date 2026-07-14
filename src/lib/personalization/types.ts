// Shared types for the Personalized Learning Engine. Runs only after a
// workout (same timing as Phase 7's Performance Engine) — never during a
// live session, never touching pose data. Reads Phase 7's already-exported
// read API and, for data Phase 7 doesn't shape publicly, its persisted
// tables directly via Prisma — but never writes to any Phase 4-7 table and
// never mutates their output. See ALGORITHM.md "Personalized Learning
// Engine".

import type {
  CoachingStyle,
  ExperienceLevel,
  FatigueProfile,
  TrainingGoal,
  WeaknessClassification,
} from "@prisma/client";
import type { ProgressTrend } from "@/lib/performance";

export type {
  CoachingStyle,
  ExperienceLevel,
  FatigueProfile,
  TrainingGoal,
  WeaknessClassification,
  ProgressTrend,
};

export interface PersonalizationEngineInput {
  userId: string;
  /** The exercise just trained, if any — scopes which per-exercise
   *  profile/threshold work this run prioritizes (avoids recomputing
   *  every exercise the user has ever done on every single session). */
  exerciseId?: string | null;
}

export interface UserLearningProfileResult {
  experienceLevel: ExperienceLevel | null;
  favoriteExercises: string[];
  weakestMovements: string[];
  strongestMovements: string[];
  preferredVolumeSets: number | null;
  trainingFrequencyPerWeek: number | null;
  fatigueProfile: FatigueProfile | null;
  consistencyProfile: ProgressTrend | null;
  injuryRiskTendency: "low" | "moderate" | "elevated" | null;
  coachingPreference: CoachingStyle;
  confidenceTrend: ProgressTrend | null;
  movementQualityTrend: ProgressTrend | null;
  learningConfidence: number;
  sessionsAnalyzed: number;
}

export interface AdaptiveThresholdResult {
  thresholdType: string;
  exerciseId: string | null;
  personalizedValue: number;
  defaultValueRef: number | null;
  confidence: number;
  sampleSize: number;
}

export interface LearnedWeaknessResult {
  issueId: string;
  exerciseId: string | null;
  classification: WeaknessClassification;
  confidence: number;
  recurrenceProbability: number | null;
}

export interface RecommendationEffectivenessResult {
  recommendationType: string;
  timesGiven: number;
  timesImprovedAfter: number;
  effectivenessScore: number | null;
}

export interface GoalProfileResult {
  goal: TrainingGoal;
  targetFrequency: number | null;
  notes: string | null;
  /** Which Performance Score dimensions matter most for this goal —
   *  informational only, never alters any existing computed score. */
  focusDimensions: string[];
}

export interface ProgressPredictionResult {
  exerciseId: string | null;
  expectedImprovementPct: number | null;
  plateauProbability: number | null;
  estimatedNextPrValue: number | null;
  estimatedNextPrDate: Date | null;
  expectedRecoveryHours: number | null;
  predictionConfidence: number;
  createdAt: Date;
}

export interface LearningSummaryResult {
  profile: UserLearningProfileResult | null;
  recoveredWeaknesses: LearnedWeaknessResult[];
  persistentWeaknesses: LearnedWeaknessResult[];
  topAdaptiveThresholds: AdaptiveThresholdResult[];
  learningConfidence: number;
}

export interface PersonalizationEngineResult {
  profile: UserLearningProfileResult;
  updatedThresholds: AdaptiveThresholdResult[];
  updatedWeaknesses: LearnedWeaknessResult[];
  prediction: ProgressPredictionResult | null;
  goal: GoalProfileResult;
}
