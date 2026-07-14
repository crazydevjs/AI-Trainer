// Trend classification — compares the early third of a session against the
// late third of the same score history. Reuses Form Engine's own
// scoreHistory (already sampled at 1Hz) plus the Movement Engine's own
// scoreHistory of the same shape; no new sampling logic beyond that.

import type { MovementScores, TrendDirection, TrendSummary } from "./types";

const MIN_POINTS = 4;
const DEFAULT_THRESHOLD = 5; // score points

/** threshold is in the same unit as `values` — defaults to score points
 *  (0-100 scale); pass an explicit threshold for other units (e.g.
 *  milliseconds for tempo). */
export function classifyTrend(
  values: number[],
  improvingIsHigher = true,
  threshold = DEFAULT_THRESHOLD
): TrendDirection {
  if (values.length < MIN_POINTS) return "insufficient-data";
  const third = Math.max(1, Math.floor(values.length / 3));
  const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const delta = avg(values.slice(-third)) - avg(values.slice(0, third));
  const signed = improvingIsHigher ? delta : -delta;
  if (signed > threshold) return "improving";
  if (signed < -threshold) return "degrading";
  return "stable";
}

const SCORE_KEYS: (keyof MovementScores)[] = [
  "smoothness",
  "control",
  "coordination",
  "symmetry",
  "consistency",
  "stability",
  "efficiency",
  "overall",
];

export function summarizeTrend(
  formOverallHistory: number[],
  movementScoreHistory: { t: number; scores: MovementScores }[]
): TrendSummary {
  const overall = classifyTrend(formOverallHistory);
  const perScore: Partial<Record<keyof MovementScores, TrendDirection>> = {};
  for (const key of SCORE_KEYS) {
    perScore[key] = classifyTrend(movementScoreHistory.map((h) => h.scores[key]));
  }

  const notes: string[] = [];
  if (overall === "degrading") notes.push("Technique quality declined as the set went on — possible fatigue.");
  if (overall === "improving") notes.push("Technique quality improved as the set went on.");
  if (perScore.stability === "degrading") notes.push("Stability decreased later in the session.");
  if (perScore.symmetry === "degrading") notes.push("Left/right symmetry decreased later in the session.");

  return { overall, perScore, notes };
}
