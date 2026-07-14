// Thin Prisma data-access layer for Phase 8's own tables, plus read-only
// queries against Phase 4-7 tables this engine needs but Phase 7's public
// read API doesn't shape at the right granularity (e.g. per-session
// technique/symmetry scores for exercise-profile learning). Every
// `prisma.*` call for this module lives here — mirrors Phase 7's
// performance-store.ts.

import { prisma } from "@/lib/prisma";
import type {
  CoachingStyle,
  ExperienceLevel,
  FatigueProfile,
  TrainingGoal,
  WeaknessClassification,
} from "@prisma/client";

// ---- UserLearningProfile ----

export async function getOrCreateLearningProfile(userId: string) {
  const existing = await prisma.userLearningProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userLearningProfile.create({ data: { userId } });
}

export interface LearningProfilePatch {
  experienceLevel?: ExperienceLevel | null;
  favoriteExercises?: string[];
  weakestMovements?: string[];
  strongestMovements?: string[];
  preferredVolumeSets?: number | null;
  trainingFrequencyPerWeek?: number | null;
  fatigueProfile?: FatigueProfile | null;
  consistencyProfile?: string | null;
  injuryRiskTendency?: string | null;
  coachingPreference?: CoachingStyle;
  confidenceTrend?: string | null;
  movementQualityTrend?: string | null;
  learningConfidence?: number;
  sessionsAnalyzed?: number;
}

export function updateLearningProfile(userId: string, patch: LearningProfilePatch) {
  return prisma.userLearningProfile.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
}

// ---- AdaptiveThreshold ----

export function findAdaptiveThreshold(userId: string, exerciseId: string | null, thresholdType: string) {
  if (exerciseId) {
    return prisma.adaptiveThreshold.findUnique({
      where: { userId_exerciseId_thresholdType: { userId, exerciseId, thresholdType } },
    });
  }
  return prisma.adaptiveThreshold.findFirst({ where: { userId, exerciseId: null, thresholdType } });
}

export function writeAdaptiveThreshold(input: {
  userId: string;
  exerciseId: string | null;
  thresholdType: string;
  personalizedValue: number;
  defaultValueRef: number | null;
  confidence: number;
  sampleSize: number;
  existingId?: string;
}) {
  const data = {
    personalizedValue: input.personalizedValue,
    defaultValueRef: input.defaultValueRef,
    confidence: input.confidence,
    sampleSize: input.sampleSize,
  };
  if (input.existingId) {
    return prisma.adaptiveThreshold.update({ where: { id: input.existingId }, data });
  }
  return prisma.adaptiveThreshold.create({
    data: { userId: input.userId, exerciseId: input.exerciseId, thresholdType: input.thresholdType, ...data },
  });
}

export function listAdaptiveThresholds(userId: string, exerciseId?: string) {
  return prisma.adaptiveThreshold.findMany({
    where: { userId, exerciseId: exerciseId ?? undefined },
    orderBy: { updatedAt: "desc" },
  });
}

// ---- LearnedWeakness ----

export function findLearnedWeakness(userId: string, exerciseId: string | null, issueId: string) {
  if (exerciseId) {
    return prisma.learnedWeakness.findUnique({
      where: { userId_exerciseId_issueId: { userId, exerciseId, issueId } },
    });
  }
  return prisma.learnedWeakness.findFirst({ where: { userId, exerciseId: null, issueId } });
}

export function writeLearnedWeakness(input: {
  userId: string;
  exerciseId: string | null;
  issueId: string;
  classification: WeaknessClassification;
  confidence: number;
  recurrenceProbability: number | null;
  existingId?: string;
}) {
  const data = {
    classification: input.classification,
    confidence: input.confidence,
    recurrenceProbability: input.recurrenceProbability,
  };
  if (input.existingId) {
    return prisma.learnedWeakness.update({ where: { id: input.existingId }, data });
  }
  return prisma.learnedWeakness.create({
    data: { userId: input.userId, exerciseId: input.exerciseId, issueId: input.issueId, ...data },
  });
}

export function listLearnedWeaknesses(userId: string, classification?: WeaknessClassification) {
  return prisma.learnedWeakness.findMany({
    where: { userId, classification },
    orderBy: { updatedAt: "desc" },
  });
}

// ---- RecommendationEffectiveness ----

export function upsertRecommendationEffectiveness(input: {
  userId: string;
  recommendationType: string;
  timesGiven: number;
  timesImprovedAfter: number;
  effectivenessScore: number | null;
  lastGivenAt?: Date;
  lastEvaluatedAt?: Date;
}) {
  const data = {
    timesGiven: input.timesGiven,
    timesImprovedAfter: input.timesImprovedAfter,
    effectivenessScore: input.effectivenessScore,
    lastGivenAt: input.lastGivenAt,
    lastEvaluatedAt: input.lastEvaluatedAt,
  };
  return prisma.recommendationEffectiveness.upsert({
    where: { userId_recommendationType: { userId: input.userId, recommendationType: input.recommendationType } },
    create: { userId: input.userId, recommendationType: input.recommendationType, ...data },
    update: data,
  });
}

export function listRecommendationEffectiveness(userId: string) {
  return prisma.recommendationEffectiveness.findMany({ where: { userId }, orderBy: { timesGiven: "desc" } });
}

// ---- GoalProfile ----

export function getGoalProfileRow(userId: string) {
  return prisma.goalProfile.findUnique({ where: { userId } });
}

export function upsertGoalProfileRow(userId: string, goal: TrainingGoal, targetFrequency?: number, notes?: string) {
  return prisma.goalProfile.upsert({
    where: { userId },
    create: { userId, goal, targetFrequency, notes },
    update: { goal, targetFrequency, notes },
  });
}

// ---- ProgressPrediction ----

export function createProgressPrediction(input: {
  userId: string;
  exerciseId: string | null;
  expectedImprovementPct: number | null;
  plateauProbability: number | null;
  estimatedNextPrValue: number | null;
  estimatedNextPrDate: Date | null;
  expectedRecoveryHours: number | null;
  predictionConfidence: number;
}) {
  return prisma.progressPrediction.create({ data: input });
}

export function getLatestPrediction(userId: string, exerciseId: string | null) {
  return prisma.progressPrediction.findFirst({
    where: { userId, exerciseId },
    orderBy: { createdAt: "desc" },
  });
}

// ---- Read-only lookups into Phase 4-7 tables (data, not internals) ----

export function getOnboardingProfile(userId: string) {
  return prisma.profile.findUnique({ where: { userId }, select: { goal: true, experience: true } });
}

export function getRecentFormAnalyses(userId: string, exerciseId: string | null, take = 30) {
  return prisma.sessionFormAnalysis.findMany({
    where: { session: { userId, exerciseId: exerciseId ?? undefined } },
    orderBy: { createdAt: "desc" },
    take,
    select: { techniqueScore: true, overallScore: true, createdAt: true },
  });
}

export function getRecentMovementAnalyses(userId: string, exerciseId: string | null, take = 30) {
  return prisma.sessionMovementAnalysis.findMany({
    where: { session: { userId, exerciseId: exerciseId ?? undefined } },
    orderBy: { createdAt: "desc" },
    take,
    select: { symmetryScore: true, consistencyScore: true, overallScore: true, dominantSide: true, createdAt: true },
  });
}

export function getRecentRiskAnalyses(userId: string, take = 30) {
  return prisma.sessionRiskAnalysis.findMany({
    where: { session: { userId } },
    orderBy: { createdAt: "desc" },
    take,
    select: { averageRisk: true, highestRisk: true, createdAt: true },
  });
}

export function getLastTwoRiskAnalyses(userId: string) {
  return prisma.sessionRiskAnalysis.findMany({
    where: { session: { userId } },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { averageRisk: true, recommendationHistory: true },
  });
}

export function getSessionsPerExercise(userId: string) {
  return prisma.workoutSession.groupBy({
    by: ["exerciseId"],
    where: { userId },
    _count: { _all: true },
  });
}

export function getExerciseSessionCount(userId: string) {
  return prisma.workoutSession.count({ where: { userId } });
}

export async function getAvgSetsPerSession(userId: string, take = 50): Promise<number | null> {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take,
    select: { _count: { select: { sets: true } } },
  });
  if (!sessions.length) return null;
  const total = sessions.reduce((sum, s) => sum + s._count.sets, 0);
  return Math.round(total / sessions.length);
}

export function getSessionTimestampsSince(userId: string, since: Date) {
  return prisma.workoutSession.findMany({
    where: { userId, startedAt: { gte: since } },
    select: { startedAt: true },
    orderBy: { startedAt: "asc" },
  });
}

/** Chronological (startedAt, maxWeightKg) pairs for one exercise — the
 *  input series for progress-predictor.ts's linear PR extrapolation. */
export async function getWeightHistory(
  userId: string,
  exerciseId: string,
  take = 50
): Promise<{ startedAt: Date; maxWeightKg: number }[]> {
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, exerciseId },
    orderBy: { startedAt: "desc" },
    take,
    select: { startedAt: true, sets: { select: { weightKg: true } } },
  });
  return sessions
    .map((s) => {
      const weights = s.sets.map((set) => set.weightKg).filter((w): w is number => w != null && w > 0);
      return weights.length ? { startedAt: s.startedAt, maxWeightKg: Math.max(...weights) } : null;
    })
    .filter((v): v is { startedAt: Date; maxWeightKg: number } => v != null)
    .reverse();
}

export function getSetsForRecentSessions(userId: string, exerciseId: string | null, take = 30) {
  return prisma.workoutSession.findMany({
    where: { userId, exerciseId: exerciseId ?? undefined },
    orderBy: { startedAt: "desc" },
    take,
    select: { id: true, startedAt: true, sets: { select: { setNumber: true } } },
  });
}

// ---- Threshold-source series, for adaptive-thresholds.ts ----

export async function getTempoScores(userId: string, exerciseId: string | null, take = 30): Promise<number[]> {
  const rows = await prisma.workoutSession.findMany({
    where: { userId, exerciseId: exerciseId ?? undefined, tempoScore: { not: null } },
    orderBy: { startedAt: "desc" },
    take,
    select: { tempoScore: true },
  });
  return rows.map((r) => r.tempoScore).filter((v): v is number => v != null);
}

export async function getFormAnalysisSeries(
  userId: string,
  exerciseId: string | null,
  field: "romScore" | "stabilityScore",
  take = 30
): Promise<number[]> {
  const rows = await prisma.sessionFormAnalysis.findMany({
    where: { session: { userId, exerciseId: exerciseId ?? undefined } },
    orderBy: { createdAt: "desc" },
    take,
    select: { [field]: true },
  });
  return rows.map((r) => r[field]);
}

export async function getMovementAnalysisSeries(
  userId: string,
  exerciseId: string | null,
  field: "symmetryScore" | "consistencyScore" | "stabilityScore" | "smoothnessScore",
  take = 30
): Promise<number[]> {
  const rows = await prisma.sessionMovementAnalysis.findMany({
    where: { session: { userId, exerciseId: exerciseId ?? undefined } },
    orderBy: { createdAt: "desc" },
    take,
    select: { [field]: true },
  });
  return rows.map((r) => r[field]);
}

export async function getRiskScoreSeries(userId: string, exerciseId: string | null, take = 30): Promise<number[]> {
  const rows = await prisma.sessionRiskAnalysis.findMany({
    where: { session: { userId, exerciseId: exerciseId ?? undefined } },
    orderBy: { createdAt: "desc" },
    take,
    select: { averageRisk: true },
  });
  return rows.map((r) => r.averageRisk);
}

export async function getCompensationEventCounts(
  userId: string,
  exerciseId: string | null,
  take = 30
): Promise<number[]> {
  const rows = await prisma.sessionMovementAnalysis.findMany({
    where: { session: { userId, exerciseId: exerciseId ?? undefined } },
    orderBy: { createdAt: "desc" },
    take,
    select: { compensation: true },
  });
  return rows.map((r) => {
    const c = r.compensation as { events?: unknown[] } | null;
    return Array.isArray(c?.events) ? c.events.length : 0;
  });
}
