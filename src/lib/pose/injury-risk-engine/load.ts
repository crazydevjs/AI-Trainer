// Heuristic 0-100 training-stress proxy for this session — reps done,
// time under tension, and (when available) external weight. Not a true
// volume-load calculation (that needs full set/rep history with weight per
// set, which lives in live-session.tsx, not this engine) — a coarse signal
// for the "reduce load" recommendation, nothing more.

import type { RiskHistory } from "./history";

export function computeLoadScore(history: RiskHistory, weightKg: number | undefined, now: number): number {
  let score = Math.min(40, history.repCount * 2);
  const elapsedMin = history.elapsedSec(now) / 60;
  score += Math.min(30, elapsedMin * 3);
  if (weightKg && weightKg > 0) score += Math.min(30, weightKg / 4);
  return Math.max(0, Math.min(100, Math.round(score)));
}
