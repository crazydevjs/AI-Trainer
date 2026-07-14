// Shared types for the Performance Intelligence & Persistence Layer. This
// layer runs entirely AFTER a workout — it receives the already-computed
// engine summaries as plain data (type-only imports below), never touches
// pose data, and never calls into the Rep/Form/Movement/Injury-Risk
// Engines' logic. See ALGORITHM.md "Performance Intelligence & Persistence
// Layer".

import type { SessionFormSummary } from "@/lib/pose/form-engine/types";
import type { SessionMovementSummary } from "@/lib/pose/movement-engine/types";
import type { SessionRiskSummary } from "@/lib/pose/injury-risk-engine/types";
import type { PersonalBestCategory } from "@prisma/client";

export type { SessionFormSummary, SessionMovementSummary, SessionRiskSummary, PersonalBestCategory };

/** Six-way classification used across the Progress Engine and trend
 *  history — distinct from (not shared with) the Movement Engine's own
 *  4-way TrendDirection, since this operates on cross-session database
 *  history, not in-memory per-frame data. */
export type ProgressTrend =
  | "rapidImprovement"
  | "improving"
  | "stable"
  | "plateau"
  | "declining"
  | "regression"
  | "insufficientData";

export interface PerformanceScores {
  workoutScore: number | null;
  exerciseScore: number | null;
  consistencyScore: number | null;
  techniqueScore: number | null;
  strengthScore: number | null;
  recoveryScore: number | null;
  volumeScore: number | null;
  overallScore: number;
}

/** One completed exercise-in-a-session, as handed to the Performance
 *  Engine by an API route right after the WorkoutSession row is created. */
export interface PerformanceEngineSessionInput {
  userId: string;
  workoutSessionId: string;
  workoutLogId: string | null;
  exerciseId: string;
  weightKg: number | null;
  durationSec: number;
  totalReps: number;
  targetReps: number;
  caloriesBurned: number;
  restSecondsBeforeSet: number | null;
  formAnalysis: SessionFormSummary | null;
  movementAnalysis: SessionMovementSummary | null;
  riskAnalysis: SessionRiskSummary | null;
}

export interface PersonalBestUpdate {
  category: PersonalBestCategory;
  value: number;
  isNewBest: boolean;
  previousValue: number | null;
}

export interface AchievementUpdate {
  slug: string;
  title: string;
  isNew: boolean;
}

export interface WeaknessUpdate {
  issueId: string;
  source: "form" | "movement";
  frequency: number;
  severity: string;
  trend: ProgressTrend;
  lastSeenAt: Date;
  improvementPct: number | null;
}

export interface PerformanceEngineResult {
  scores: PerformanceScores;
  newPersonalBests: PersonalBestUpdate[];
  newAchievements: AchievementUpdate[];
  weaknesses: WeaknessUpdate[];
  exerciseProgress: ProgressTrend;
  overallProgress: ProgressTrend;
  historyCount: number;
}

// ---- Read-service (API) result shapes ----

export interface WorkoutHistoryEntry {
  workoutLogId: string | null;
  workoutSessionId: string;
  exerciseId: string;
  exerciseName: string;
  startedAt: Date;
  durationSec: number;
  totalReps: number;
  overallScore: number | null;
  formScore: number | null;
  performanceScore: number | null;
}

export interface ExerciseHistoryEntry {
  workoutSessionId: string;
  startedAt: Date;
  overallScore: number | null;
  performanceScore: number | null;
  weightKg: number | null;
  totalReps: number;
}

export interface PerformanceTrendResult {
  exerciseId: string | null;
  sevenSessionTrend: ProgressTrend;
  thirtyDayTrend: ProgressTrend;
  ninetyDayTrend: ProgressTrend;
  rollingAvgScore: number | null;
  improvementPct: number | null;
  regressionPct: number | null;
  sessionsAnalyzed: number;
}

export interface WeaknessTrendEntry {
  issueId: string;
  source: string;
  exerciseId: string | null;
  frequency: number;
  severity: string;
  trend: string;
  lastSeenAt: Date;
  improvementPct: number | null;
}

export interface RiskTrendEntry {
  workoutSessionId: string;
  startedAt: Date;
  highestRisk: number;
  averageRisk: number;
  riskTrend: string;
}

export interface PersonalBestEntry {
  category: PersonalBestCategory;
  exerciseId: string | null;
  value: number;
  achievedAt: Date;
}

export interface AchievementEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}
