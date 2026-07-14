import { prisma } from "@/lib/prisma";
import type { CompletionStats, CoachUsageStats, ExercisePopularityEntry, PersonalizationAdoptionStats } from "./types";

const COMPLETION_THRESHOLD_PCT = 80;

function cutoffDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getWorkoutCompletionStats(days = 30): Promise<CompletionStats> {
  const sessions = await prisma.workoutSession.findMany({
    where: { startedAt: { gte: cutoffDate(days) } },
    select: { completionPct: true },
  });

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => (s.completionPct ?? 0) >= COMPLETION_THRESHOLD_PCT).length;
  const withPct = sessions.filter((s) => s.completionPct != null);
  const avgCompletionPct = withPct.length
    ? withPct.reduce((sum, s) => sum + (s.completionPct ?? 0), 0) / withPct.length
    : 0;

  return {
    totalSessions,
    completedSessions,
    completionRate: totalSessions ? completedSessions / totalSessions : 0,
    avgCompletionPct,
  };
}

export async function getAverageSessionDuration(days = 30): Promise<number> {
  const result = await prisma.workoutSession.aggregate({
    where: { startedAt: { gte: cutoffDate(days) }, durationSec: { gt: 0 } },
    _avg: { durationSec: true },
  });
  return result._avg.durationSec ?? 0;
}

export async function getExercisePopularity(days = 30, limit = 10): Promise<ExercisePopularityEntry[]> {
  const grouped = await prisma.workoutSession.groupBy({
    by: ["exerciseId"],
    where: { startedAt: { gte: cutoffDate(days) } },
    _count: { exerciseId: true },
    orderBy: { _count: { exerciseId: "desc" } },
    take: limit,
  });

  const exercises = await prisma.exercise.findMany({
    where: { id: { in: grouped.map((g) => g.exerciseId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(exercises.map((e) => [e.id, e.name]));

  return grouped.map((g) => ({
    exerciseId: g.exerciseId,
    exerciseName: nameById.get(g.exerciseId) ?? "Unknown",
    sessionCount: g._count.exerciseId,
  }));
}

export async function getCoachUsageStats(days = 30): Promise<CoachUsageStats> {
  const logs = await prisma.workoutLog.findMany({
    where: { startedAt: { gte: cutoffDate(days) } },
    select: { summary: true },
  });
  const logsWithCoachSummary = logs.filter((l) => l.summary != null && l.summary.length > 0).length;

  return {
    totalWorkoutLogs: logs.length,
    logsWithCoachSummary,
    adoptionRate: logs.length ? logsWithCoachSummary / logs.length : 0,
  };
}

export async function getPersonalizationAdoptionStats(): Promise<PersonalizationAdoptionStats> {
  const [totalUsers, usersWithLearningProfile] = await Promise.all([
    prisma.user.count(),
    prisma.userLearningProfile.count(),
  ]);
  return { totalUsers, usersWithLearningProfile, adoptionRate: totalUsers ? usersWithLearningProfile / totalUsers : 0 };
}
