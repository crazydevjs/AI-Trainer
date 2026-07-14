// Fatigue-curve classification. Persisted Injury Risk Engine data is
// session-level only (SessionRiskAnalysis.averageRisk/highestRisk, not a
// dedicated fatigue column — fatigue is one of ten weighted factors inside
// that score, see injury-risk-engine/risk-model.ts), so this heuristic
// works from average risk plus the gap between sessions as a volume/
// recovery proxy — not a physiological measurement. "Volume tolerance" is
// folded into the classification rather than a separate stored field —
// see ALGORITHM.md "Known limitations".

import { classifyProgress } from "@/lib/performance";
import { getRecentRiskAnalyses, getSessionTimestampsSince } from "./personalization-store";
import type { FatigueProfile } from "./types";

const MIN_SAMPLES = 5;
const SHORT_GAP_HOURS = 48;
const SLOW_RECOVERY_GAP_DELTA = 10; // risk-score points
const FATIGUE_RESISTANT_CEILING = 30; // avg risk score

const avg = (a: number[]) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : null);

export async function computeFatigueProfile(userId: string): Promise<FatigueProfile> {
  const rows = await getRecentRiskAnalyses(userId, 30); // most-recent-first
  if (rows.length < MIN_SAMPLES) return "INSUFFICIENT_DATA";

  const chronological = [...rows].reverse();
  const shortGapRisks: number[] = [];
  const longGapRisks: number[] = [];
  for (let i = 1; i < chronological.length; i++) {
    const gapHours =
      (chronological[i].createdAt.getTime() - chronological[i - 1].createdAt.getTime()) / (1000 * 60 * 60);
    (gapHours < SHORT_GAP_HOURS ? shortGapRisks : longGapRisks).push(chronological[i].averageRisk);
  }

  const shortAvg = avg(shortGapRisks);
  const longAvg = avg(longGapRisks);
  const overallAvg = avg(chronological.map((r) => r.averageRisk)) ?? 0;

  // classifyProgress() assumes higher-is-better; risk is the opposite
  // (higher = worse), so negate the series — a rising raw risk trend
  // becomes a falling negated trend, correctly reading as "declining"/
  // "regression" (rapid fatigue accumulation).
  const recentTrend = classifyProgress(chronological.map((r) => -r.averageRisk));
  if (recentTrend === "declining" || recentTrend === "regression") return "RAPID_FATIGUE";

  if (shortAvg != null && longAvg != null && shortAvg > longAvg + SLOW_RECOVERY_GAP_DELTA) {
    return "SLOW_RECOVERY";
  }

  return overallAvg < FATIGUE_RESISTANT_CEILING ? "FATIGUE_RESISTANT" : "EASY_RECOVERY";
}

export async function computeInjuryRiskTendency(userId: string): Promise<"low" | "moderate" | "elevated" | null> {
  const rows = await getRecentRiskAnalyses(userId, 30);
  const overallAvg = avg(rows.map((r) => r.averageRisk));
  if (overallAvg == null) return null;
  if (overallAvg < 30) return "low";
  if (overallAvg < 60) return "moderate";
  return "elevated";
}

/** Expected recovery time, in hours, before risk tends to normalize —
 *  used by progress-predictor.ts. Conservative default when data is thin. */
export async function estimateExpectedRecoveryHours(userId: string): Promise<number | null> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const timestamps = await getSessionTimestampsSince(userId, since);
  if (timestamps.length < 3) return null;

  const gapsHours: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    gapsHours.push((timestamps[i].startedAt.getTime() - timestamps[i - 1].startedAt.getTime()) / (1000 * 60 * 60));
  }
  const meanGap = avg(gapsHours);
  return meanGap != null ? Math.round(meanGap) : null;
}
