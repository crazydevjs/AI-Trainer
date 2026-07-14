// 0-1 confidence in the current risk estimate — how much history backs it
// up, not how "sure" we are of any single reading. Blends history depth
// (reps analyzed), the Form Engine's own per-frame confidence (a proxy for
// how trustworthy the underlying pose tracking is this frame), and how far
// into the session we are.

import type { RiskHistory } from "./history";

export function computeConfidence(history: RiskHistory, formConfidence: number, now: number): number {
  const repFactor = Math.min(1, history.repCount / 6);
  const sessionFactor = Math.min(1, history.elapsedSec(now) / 60);
  const blended = repFactor * 0.4 + formConfidence * 0.4 + sessionFactor * 0.2;
  return Math.round(Math.max(0, Math.min(1, blended)) * 100) / 100;
}
