// Orchestrator — the one integration surface API routes call. No per-frame
// state (same shape as Phase 7's performance-engine.ts): a plain async
// pipeline invoked once per completed session, strictly after Phase 7's
// Performance Engine has already run. Never writes to any Phase 4-7 table.

import { computeAdaptiveThresholds, getAdaptiveThresholds, toResult as toThresholdResult } from "./adaptive-thresholds";
import { getCoachingPreference } from "./coach-personality";
import {
  computeConfidenceTrend,
  computeLearningConfidence,
  computeMovementQualityTrend,
} from "./confidence-learning";
import { computeFatigueProfile, computeInjuryRiskTendency } from "./fatigue-learning";
import { getGoalProfile } from "./goal-engine";
import { learnProfileFields } from "./learning-engine";
import {
  createProgressPrediction,
  findAdaptiveThreshold,
  findLearnedWeakness,
  listLearnedWeaknesses,
  writeAdaptiveThreshold,
  writeLearnedWeakness,
} from "./personalization-store";
import { predictProgress } from "./progress-predictor";
import { evaluateRecommendationEffectiveness } from "./recommendation-learning";
import { getUserProfile, applyProfilePatch } from "./user-profile";
import { classifyWeaknesses } from "./weakness-learning";
import type {
  AdaptiveThresholdResult,
  LearnedWeaknessResult,
  LearningSummaryResult,
  PersonalizationEngineInput,
  PersonalizationEngineResult,
  ProgressPredictionResult,
} from "./types";

export async function runPersonalizationEngine(
  input: PersonalizationEngineInput
): Promise<PersonalizationEngineResult> {
  const { userId, exerciseId = null } = input;

  const [learned, confidenceTrend, movementQualityTrend, learningConfidence, fatigueProfile, injuryRiskTendency] =
    await Promise.all([
      learnProfileFields(userId),
      computeConfidenceTrend(userId),
      computeMovementQualityTrend(userId),
      computeLearningConfidence(userId),
      computeFatigueProfile(userId),
      computeInjuryRiskTendency(userId),
    ]);

  const coachingPreference = await getCoachingPreference(userId);

  const profile = await applyProfilePatch(userId, {
    experienceLevel: learned.experienceLevel,
    favoriteExercises: learned.favoriteExercises,
    weakestMovements: learned.weakestMovements,
    strongestMovements: learned.strongestMovements,
    preferredVolumeSets: learned.preferredVolumeSets,
    consistencyProfile: learned.consistencyProfile,
    fatigueProfile,
    injuryRiskTendency,
    confidenceTrend,
    movementQualityTrend,
    coachingPreference,
    learningConfidence,
    sessionsAnalyzed: learned.sessionsAnalyzed,
  });

  // --- Adaptive thresholds ---
  const thresholdCandidates = await computeAdaptiveThresholds(userId, exerciseId);
  const updatedThresholds: AdaptiveThresholdResult[] = [];
  for (const c of thresholdCandidates) {
    const existing = await findAdaptiveThreshold(userId, exerciseId, c.type);
    const confidence = Math.round(Math.min(1, c.sampleSize / 15) * 100) / 100;
    const row = await writeAdaptiveThreshold({
      userId,
      exerciseId,
      thresholdType: c.type,
      personalizedValue: c.value,
      defaultValueRef: c.defaultRef,
      confidence,
      sampleSize: c.sampleSize,
      existingId: existing?.id,
    });
    updatedThresholds.push(toThresholdResult(row));
  }

  // --- Weakness classification ---
  const classifications = await classifyWeaknesses(userId, learned.sessionsAnalyzed);
  const updatedWeaknesses: LearnedWeaknessResult[] = [];
  for (const c of classifications) {
    const existing = await findLearnedWeakness(userId, c.exerciseId, c.issueId);
    const row = await writeLearnedWeakness({
      userId,
      exerciseId: c.exerciseId,
      issueId: c.issueId,
      classification: c.classification,
      confidence: c.confidence,
      recurrenceProbability: c.recurrenceProbability,
      existingId: existing?.id,
    });
    updatedWeaknesses.push({
      issueId: row.issueId,
      exerciseId: row.exerciseId,
      classification: row.classification,
      confidence: row.confidence,
      recurrenceProbability: row.recurrenceProbability,
    });
  }

  // --- Recommendation effectiveness (side effect only — not returned) ---
  await evaluateRecommendationEffectiveness(userId);

  // --- Prediction ---
  let prediction: ProgressPredictionResult | null = null;
  const predicted = await predictProgress(userId, exerciseId);
  if (predicted.expectedImprovementPct != null || predicted.estimatedNextPrValue != null) {
    const saved = await createProgressPrediction({
      userId,
      exerciseId: predicted.exerciseId,
      expectedImprovementPct: predicted.expectedImprovementPct,
      plateauProbability: predicted.plateauProbability,
      estimatedNextPrValue: predicted.estimatedNextPrValue,
      estimatedNextPrDate: predicted.estimatedNextPrDate,
      expectedRecoveryHours: predicted.expectedRecoveryHours,
      predictionConfidence: predicted.predictionConfidence,
    });
    prediction = {
      exerciseId: saved.exerciseId,
      expectedImprovementPct: saved.expectedImprovementPct,
      plateauProbability: saved.plateauProbability,
      estimatedNextPrValue: saved.estimatedNextPrValue,
      estimatedNextPrDate: saved.estimatedNextPrDate,
      expectedRecoveryHours: saved.expectedRecoveryHours,
      predictionConfidence: saved.predictionConfidence,
      createdAt: saved.createdAt,
    };
  }

  const goal = await getGoalProfile(userId);

  return { profile, updatedThresholds, updatedWeaknesses, prediction, goal };
}

/** Cross-cutting read summary — does not compute anything new, only reads
 *  what runPersonalizationEngine() has already persisted. */
export async function getLearningSummary(userId: string): Promise<LearningSummaryResult> {
  const [profile, recovered, persistent, thresholds] = await Promise.all([
    getUserProfile(userId),
    listLearnedWeaknesses(userId, "RESOLVED"),
    listLearnedWeaknesses(userId, "PERSISTENT"),
    getAdaptiveThresholds(userId),
  ]);

  const toWeaknessResult = (r: Awaited<ReturnType<typeof listLearnedWeaknesses>>[number]): LearnedWeaknessResult => ({
    issueId: r.issueId,
    exerciseId: r.exerciseId,
    classification: r.classification,
    confidence: r.confidence,
    recurrenceProbability: r.recurrenceProbability,
  });

  return {
    profile,
    recoveredWeaknesses: recovered.map(toWeaknessResult),
    persistentWeaknesses: persistent.map(toWeaknessResult),
    topAdaptiveThresholds: [...thresholds].sort((a, b) => b.confidence - a.confidence).slice(0, 5),
    learningConfidence: profile.learningConfidence,
  };
}
