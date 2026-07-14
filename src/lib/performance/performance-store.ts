// Thin Prisma data-access layer — every `prisma.*` call for the Phase 7
// models lives here, so the rest of src/lib/performance/ never imports
// `@/lib/prisma` directly. Mirrors how prior phases centralized engine
// state behind one class; here it's a set of narrow, single-purpose
// functions since there's no per-session mutable state to hold (this
// layer runs once per completed session, not once per frame).

import { prisma } from "@/lib/prisma";
import type { Prisma, PersonalBestCategory } from "@prisma/client";
import type {
  PerformanceScores,
  SessionFormSummary,
  SessionMovementSummary,
  SessionRiskSummary,
} from "./types";

const toJson = (v: unknown) => v as Prisma.InputJsonValue;

export function saveFormAnalysis(sessionId: string, s: SessionFormSummary) {
  return prisma.sessionFormAnalysis.create({
    data: {
      sessionId,
      jointScore: s.scores.joint,
      alignmentScore: s.scores.alignment,
      balanceScore: s.scores.balance,
      romScore: s.scores.rom,
      stabilityScore: s.scores.stability,
      movementQualityScore: s.scores.movementQuality,
      techniqueScore: s.scores.technique,
      overallScore: s.scores.overall,
      topIssues: s.topIssues,
      hasExerciseProfile: s.hasExerciseProfile,
      issueLog: toJson(s.issueLog),
      scoreHistory: toJson(s.scoreHistory),
      weaknesses: toJson(s.weaknesses),
    },
  });
}

export function saveMovementAnalysis(sessionId: string, s: SessionMovementSummary) {
  return prisma.sessionMovementAnalysis.create({
    data: {
      sessionId,
      smoothnessScore: s.scores.smoothness,
      controlScore: s.scores.control,
      coordinationScore: s.scores.coordination,
      symmetryScore: s.scores.symmetry,
      consistencyScore: s.scores.consistency,
      stabilityScore: s.scores.stability,
      efficiencyScore: s.scores.efficiency,
      overallScore: s.scores.overall,
      dominantSide: s.symmetry.dominantSide,
      strengths: s.strengths,
      weaknesses: s.weaknesses,
      focusAreas: s.focusAreas,
      scoreHistory: toJson(s.scoreHistory),
      consistency: toJson(s.consistency),
      symmetry: toJson(s.symmetry),
      compensation: toJson(s.compensation),
      trend: toJson(s.trend),
    },
  });
}

export function saveRiskAnalysis(sessionId: string, s: SessionRiskSummary) {
  return prisma.sessionRiskAnalysis.create({
    data: {
      sessionId,
      highestRisk: s.highestRisk,
      averageRisk: s.averageRisk,
      riskTrend: s.riskTrend,
      mostCommonCauses: s.mostCommonCauses,
      riskTimeline: toJson(s.riskTimeline),
      recommendationHistory: toJson(s.recommendationHistory),
    },
  });
}

export function saveSnapshot(input: {
  userId: string;
  workoutSessionId?: string;
  workoutLogId?: string;
  exerciseId?: string;
  scores: PerformanceScores;
}) {
  return prisma.performanceSnapshot.create({
    data: {
      userId: input.userId,
      workoutSessionId: input.workoutSessionId,
      workoutLogId: input.workoutLogId,
      exerciseId: input.exerciseId,
      workoutScore: input.scores.workoutScore,
      exerciseScore: input.scores.exerciseScore,
      consistencyScore: input.scores.consistencyScore,
      techniqueScore: input.scores.techniqueScore,
      strengthScore: input.scores.strengthScore,
      recoveryScore: input.scores.recoveryScore,
      volumeScore: input.scores.volumeScore,
      overallScore: input.scores.overallScore,
    },
  });
}

export function getRecentSnapshots(userId: string, exerciseId: string | null, since: Date, take = 200) {
  return prisma.performanceSnapshot.findMany({
    where: { userId, exerciseId: exerciseId ?? undefined, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    take,
    select: { createdAt: true, overallScore: true },
  });
}

export function findWeakness(userId: string, exerciseId: string | null, issueId: string) {
  return prisma.weaknessHistory.findFirst({ where: { userId, exerciseId, issueId } });
}

export function upsertWeakness(input: {
  userId: string;
  exerciseId: string | null;
  issueId: string;
  source: "form" | "movement";
  severity: string;
  trend: string;
  frequency: number;
  improvementPct: number | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
}) {
  if (input.exerciseId) {
    return prisma.weaknessHistory.upsert({
      where: {
        userId_exerciseId_issueId: {
          userId: input.userId,
          exerciseId: input.exerciseId,
          issueId: input.issueId,
        },
      },
      create: {
        userId: input.userId,
        exerciseId: input.exerciseId,
        issueId: input.issueId,
        source: input.source,
        severity: input.severity,
        trend: input.trend,
        frequency: input.frequency,
        improvementPct: input.improvementPct,
        firstSeenAt: input.firstSeenAt,
        lastSeenAt: input.lastSeenAt,
      },
      update: {
        severity: input.severity,
        trend: input.trend,
        frequency: input.frequency,
        improvementPct: input.improvementPct,
        lastSeenAt: input.lastSeenAt,
      },
    });
  }
  // exerciseId is part of the compound unique key, and Postgres treats NULL
  // as distinct in unique indexes — a null-exerciseId row can't use
  // prisma.upsert() safely. Find-then-write instead. See ALGORITHM.md
  // "Known limitations".
  return prisma.weaknessHistory
    .findFirst({ where: { userId: input.userId, exerciseId: null, issueId: input.issueId } })
    .then((existing) =>
      existing
        ? prisma.weaknessHistory.update({
            where: { id: existing.id },
            data: {
              severity: input.severity,
              trend: input.trend,
              frequency: input.frequency,
              improvementPct: input.improvementPct,
              lastSeenAt: input.lastSeenAt,
            },
          })
        : prisma.weaknessHistory.create({
            data: {
              userId: input.userId,
              exerciseId: null,
              issueId: input.issueId,
              source: input.source,
              severity: input.severity,
              trend: input.trend,
              frequency: input.frequency,
              improvementPct: input.improvementPct,
              firstSeenAt: input.firstSeenAt,
              lastSeenAt: input.lastSeenAt,
            },
          })
    );
}

export function findPersonalBest(
  userId: string,
  exerciseId: string | null,
  category: PersonalBestCategory
) {
  if (exerciseId) {
    return prisma.personalBest.findUnique({
      where: { userId_exerciseId_category: { userId, exerciseId, category } },
    });
  }
  return prisma.personalBest.findFirst({ where: { userId, exerciseId: null, category } });
}

export function writePersonalBest(input: {
  userId: string;
  exerciseId: string | null;
  category: PersonalBestCategory;
  value: number;
  workoutSessionId: string;
  existingId?: string;
}) {
  if (input.existingId) {
    return prisma.personalBest.update({
      where: { id: input.existingId },
      data: { value: input.value, workoutSessionId: input.workoutSessionId, achievedAt: new Date() },
    });
  }
  return prisma.personalBest.create({
    data: {
      userId: input.userId,
      exerciseId: input.exerciseId,
      category: input.category,
      value: input.value,
      workoutSessionId: input.workoutSessionId,
    },
  });
}

export function upsertTrendHistory(input: {
  userId: string;
  exerciseId: string | null;
  sevenSessionTrend: string;
  thirtyDayTrend: string;
  ninetyDayTrend: string;
  rollingAvgScore: number | null;
  improvementPct: number | null;
  regressionPct: number | null;
  sessionsAnalyzed: number;
}) {
  const data = {
    sevenSessionTrend: input.sevenSessionTrend,
    thirtyDayTrend: input.thirtyDayTrend,
    ninetyDayTrend: input.ninetyDayTrend,
    rollingAvgScore: input.rollingAvgScore,
    improvementPct: input.improvementPct,
    regressionPct: input.regressionPct,
    sessionsAnalyzed: input.sessionsAnalyzed,
  };
  if (input.exerciseId) {
    return prisma.trendHistory.upsert({
      where: { userId_exerciseId: { userId: input.userId, exerciseId: input.exerciseId } },
      create: { userId: input.userId, exerciseId: input.exerciseId, ...data },
      update: data,
    });
  }
  return prisma.trendHistory
    .findFirst({ where: { userId: input.userId, exerciseId: null } })
    .then((existing) =>
      existing
        ? prisma.trendHistory.update({ where: { id: existing.id }, data })
        : prisma.trendHistory.create({ data: { userId: input.userId, exerciseId: null, ...data } })
    );
}

export function upsertUserStatistics(
  userId: string,
  patch: Partial<{
    sessionsAnalyzed: number;
    avgPerformanceScore: number | null;
    avgTechniqueScore: number | null;
    bestPerformanceScore: number | null;
    totalPerfectReps: number;
    totalPerfectSessions: number;
    consistencyStreak: number;
    longestConsistencyStreak: number;
    lastAnalyzedAt: Date;
  }>
) {
  return prisma.userStatistics.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
}

export function getUserStatistics(userId: string) {
  return prisma.userStatistics.findUnique({ where: { userId } });
}

export function awardAchievement(userId: string, slug: string) {
  return prisma.achievement
    .findUnique({ where: { slug } })
    .then((achievement) =>
      achievement
        ? prisma.userAchievement.upsert({
            where: { userId_achievementId: { userId, achievementId: achievement.id } },
            create: { userId, achievementId: achievement.id },
            update: {},
          })
        : null
    );
}

export function hasAchievement(userId: string, slug: string) {
  return prisma.userAchievement.findFirst({
    where: { userId, achievement: { slug } },
    select: { id: true },
  });
}

// ---- Read queries backing session-service.ts ----

export function queryWorkoutHistory(userId: string, take = 50) {
  return prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take,
    include: { exercise: { select: { name: true } }, performanceSnapshot: true },
  });
}

export function queryExerciseHistory(userId: string, exerciseId: string, take = 100) {
  return prisma.workoutSession.findMany({
    where: { userId, exerciseId },
    orderBy: { startedAt: "desc" },
    take,
    include: { performanceSnapshot: true, sets: { select: { weightKg: true } } },
  });
}

export function queryTrend(userId: string, exerciseId: string | null) {
  return prisma.trendHistory.findFirst({ where: { userId, exerciseId } });
}

export function queryWeaknessTrend(userId: string, exerciseId?: string) {
  return prisma.weaknessHistory.findMany({
    where: { userId, exerciseId: exerciseId ?? undefined },
    orderBy: { lastSeenAt: "desc" },
  });
}

export function queryRiskTrend(userId: string, take = 30) {
  return prisma.workoutSession.findMany({
    where: { userId, riskAnalysis: { isNot: null } },
    orderBy: { startedAt: "desc" },
    take,
    select: { id: true, startedAt: true, riskAnalysis: true },
  });
}

export function queryPersonalBests(userId: string) {
  return prisma.personalBest.findMany({ where: { userId }, orderBy: { category: "asc" } });
}

export function queryAchievements(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
    include: { achievement: true },
  });
}
