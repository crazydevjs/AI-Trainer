// Confidence/movement-quality trend labels + overall learning confidence.
// Reuses Phase 7's classifyProgress() (see index.ts's "Reuse note") rather
// than reimplementing the same early-vs-late window comparison a third
// time.

import { classifyProgress } from "@/lib/performance";
import { getExerciseSessionCount, getRecentFormAnalyses, getRecentMovementAnalyses } from "./personalization-store";
import type { ProgressTrend } from "./types";

const CONFIDENCE_SATURATION_SESSIONS = 20;

export async function computeConfidenceTrend(userId: string): Promise<ProgressTrend> {
  const rows = await getRecentFormAnalyses(userId, null, 30);
  const values = rows.map((r) => r.overallScore).reverse(); // chronological
  return classifyProgress(values);
}

export async function computeMovementQualityTrend(userId: string): Promise<ProgressTrend> {
  const rows = await getRecentMovementAnalyses(userId, null, 30);
  const values = rows.map((r) => r.overallScore).reverse();
  return classifyProgress(values);
}

/** 0..1 — how much data backs this user's learning profile. Saturates at
 *  CONFIDENCE_SATURATION_SESSIONS analyzed sessions, same data-availability
 *  proxy shape as the Injury Risk Engine's confidence.ts. */
export async function computeLearningConfidence(userId: string): Promise<number> {
  const sessionCount = await getExerciseSessionCount(userId);
  return Math.round(Math.min(1, sessionCount / CONFIDENCE_SATURATION_SESSIONS) * 100) / 100;
}
