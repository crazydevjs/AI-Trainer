// Recommendation effectiveness tracking — a correlation proxy, not
// confirmed causation (see ALGORITHM.md "Known limitations"). Compares the
// previous session's Injury Risk recommendations against whether average
// risk improved by the current session.

import {
  getLastTwoRiskAnalyses,
  listRecommendationEffectiveness,
  upsertRecommendationEffectiveness,
} from "./personalization-store";
import type { RecommendationEffectivenessResult } from "./types";

interface RecommendationHistoryEntry {
  at: number;
  action: string;
  text: string;
}

export async function evaluateRecommendationEffectiveness(
  userId: string
): Promise<RecommendationEffectivenessResult[]> {
  const recent = await getLastTwoRiskAnalyses(userId);
  if (recent.length < 2) return [];

  const [current, previous] = recent;
  const history = (previous.recommendationHistory as unknown as RecommendationHistoryEntry[]) ?? [];
  if (!history.length) return [];

  const improved = current.averageRisk < previous.averageRisk;
  const actionTypes = Array.from(new Set(history.map((h) => h.action)));
  const existingRows = await listRecommendationEffectiveness(userId);

  const results: RecommendationEffectivenessResult[] = [];
  for (const action of actionTypes) {
    const existing = existingRows.find((r) => r.recommendationType === action);
    const timesGiven = (existing?.timesGiven ?? 0) + 1;
    const timesImprovedAfter = (existing?.timesImprovedAfter ?? 0) + (improved ? 1 : 0);
    const effectivenessScore = Math.round((timesImprovedAfter / timesGiven) * 100);

    await upsertRecommendationEffectiveness({
      userId,
      recommendationType: action,
      timesGiven,
      timesImprovedAfter,
      effectivenessScore,
      lastGivenAt: new Date(),
      lastEvaluatedAt: new Date(),
    });

    results.push({ recommendationType: action, timesGiven, timesImprovedAfter, effectivenessScore });
  }
  return results;
}

export async function getRecommendationHistory(userId: string): Promise<RecommendationEffectivenessResult[]> {
  const rows = await listRecommendationEffectiveness(userId);
  return rows.map((r) => ({
    recommendationType: r.recommendationType,
    timesGiven: r.timesGiven,
    timesImprovedAfter: r.timesImprovedAfter,
    effectivenessScore: r.effectivenessScore,
  }));
}
