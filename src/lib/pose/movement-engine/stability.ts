// Stability scoring — reuses the Form Engine's own rolling sway variance
// (already computed for its Balance/Stability scores, exposed via
// FormAnalysisSnapshot.sway) rather than re-deriving drift from keypoints.
//
// Scoping note: "vertical drift" specifically isn't modeled here — isolating
// unwanted vertical wobble from intentional rep depth change (a squat is
// *supposed* to move vertically) isn't reliable from 2D pose alone without
// much more sophisticated filtering than this phase attempts. Lateral hip
// sway and torso-lean variance are the two axes that read as reliable
// "unwanted movement" signals independent of the exercise's intended path —
// see ALGORITHM.md "Known limitations".

export interface SwayStats {
  hipSwayStdDev: number | null;
  leanStdDev: number | null;
}

export function computeStabilityScore(sway: SwayStats, recentCompensationCount: number): number {
  let score = 100;
  if (sway.hipSwayStdDev != null) score -= Math.min(40, sway.hipSwayStdDev * 300);
  if (sway.leanStdDev != null) score -= Math.min(30, sway.leanStdDev * 4);
  score -= Math.min(20, recentCompensationCount * 5);
  return Math.max(0, Math.round(score));
}

export function describeDrift(sway: SwayStats): string[] {
  const notes: string[] = [];
  if (sway.hipSwayStdDev != null && sway.hipSwayStdDev > 0.05) notes.push("lateral hip sway");
  if (sway.leanStdDev != null && sway.leanStdDev > 6) notes.push("torso lean variability");
  return notes;
}
