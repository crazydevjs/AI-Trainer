// Public read API — the 7 functions the Performance Intelligence layer
// exposes to the rest of the app (backing src/app/api/performance/*).
// Each is a thin shape-and-return over performance-store.ts's queries.

import * as store from "./performance-store";
import { getExerciseHistoryEntries } from "./exercise-history";
import type {
  AchievementEntry,
  ExerciseHistoryEntry,
  PerformanceTrendResult,
  PersonalBestEntry,
  ProgressTrend,
  RiskTrendEntry,
  WeaknessTrendEntry,
  WorkoutHistoryEntry,
} from "./types";

export async function getWorkoutHistory(userId: string): Promise<WorkoutHistoryEntry[]> {
  const rows = await store.queryWorkoutHistory(userId);
  return rows.map((r) => ({
    workoutLogId: r.workoutLogId,
    workoutSessionId: r.id,
    exerciseId: r.exerciseId,
    exerciseName: r.exercise.name,
    startedAt: r.startedAt,
    durationSec: r.durationSec,
    totalReps: r.totalReps,
    overallScore: r.overallScore,
    formScore: r.formScore,
    performanceScore: r.performanceSnapshot?.overallScore ?? null,
  }));
}

export async function getExerciseHistory(userId: string, exerciseId: string): Promise<ExerciseHistoryEntry[]> {
  return getExerciseHistoryEntries(userId, exerciseId);
}

export async function getPerformanceTrend(
  userId: string,
  exerciseId: string | null = null
): Promise<PerformanceTrendResult | null> {
  const row = await store.queryTrend(userId, exerciseId);
  if (!row) return null;
  return {
    exerciseId: row.exerciseId,
    sevenSessionTrend: row.sevenSessionTrend as ProgressTrend,
    thirtyDayTrend: row.thirtyDayTrend as ProgressTrend,
    ninetyDayTrend: row.ninetyDayTrend as ProgressTrend,
    rollingAvgScore: row.rollingAvgScore,
    improvementPct: row.improvementPct,
    regressionPct: row.regressionPct,
    sessionsAnalyzed: row.sessionsAnalyzed,
  };
}

export async function getWeaknessTrend(userId: string, exerciseId?: string): Promise<WeaknessTrendEntry[]> {
  const rows = await store.queryWeaknessTrend(userId, exerciseId);
  return rows.map((r) => ({
    issueId: r.issueId,
    source: r.source,
    exerciseId: r.exerciseId,
    frequency: r.frequency,
    severity: r.severity,
    trend: r.trend,
    lastSeenAt: r.lastSeenAt,
    improvementPct: r.improvementPct,
  }));
}

export async function getRiskTrend(userId: string): Promise<RiskTrendEntry[]> {
  const rows = await store.queryRiskTrend(userId);
  return rows
    .filter((r): r is typeof r & { riskAnalysis: NonNullable<typeof r.riskAnalysis> } => r.riskAnalysis != null)
    .map((r) => ({
      workoutSessionId: r.id,
      startedAt: r.startedAt,
      highestRisk: r.riskAnalysis.highestRisk,
      averageRisk: r.riskAnalysis.averageRisk,
      riskTrend: r.riskAnalysis.riskTrend,
    }));
}

export async function getPersonalBests(userId: string): Promise<PersonalBestEntry[]> {
  const rows = await store.queryPersonalBests(userId);
  return rows.map((r) => ({
    category: r.category,
    exerciseId: r.exerciseId,
    value: r.value,
    achievedAt: r.achievedAt,
  }));
}

export async function getAchievements(userId: string): Promise<AchievementEntry[]> {
  const rows = await store.queryAchievements(userId);
  return rows.map((r) => ({
    slug: r.achievement.slug,
    title: r.achievement.title,
    description: r.achievement.description,
    icon: r.achievement.icon,
    unlockedAt: r.unlockedAt,
  }));
}
