// Heuristic 0-100 fatigue score. Deliberately not a physiology model — no
// heart rate, no EMG, no metabolic estimate. Just: is rep pace slowing, is
// rep quality declining, is rest getting short, and how much work has
// already been done this session. Reuses the Movement Engine's own
// classifyTrend() (read-only import) rather than re-implementing trend math.

import { classifyTrend } from "../movement-engine/trend";
import type { RiskHistory } from "./history";

const TEMPO_THRESHOLD_MS = 300;

export function computeFatigueScore(
  history: RiskHistory,
  secondsSinceLastRep: number | null,
  now: number
): number {
  let score = 0;

  const intervals = history.getRepIntervalsMs();
  if (intervals.length >= 4) {
    // Slower gaps between reps later in the set read as fatigue.
    const dir = classifyTrend(intervals, false, TEMPO_THRESHOLD_MS);
    if (dir === "degrading") score += 25;
    else if (dir === "stable") score += 8;
  }

  const repScores = history.getRepScores();
  if (repScores.length >= 4) {
    const dir = classifyTrend(repScores);
    if (dir === "degrading") score += 25;
    else if (dir === "stable") score += 5;
  }

  if (secondsSinceLastRep != null && secondsSinceLastRep < 10 && history.repCount > 3) {
    score += 10;
  }

  const elapsedMin = history.elapsedSec(now) / 60;
  score += Math.min(20, elapsedMin * 2.5);
  score += Math.min(15, history.repCount * 0.8);

  return Math.max(0, Math.min(100, Math.round(score)));
}
