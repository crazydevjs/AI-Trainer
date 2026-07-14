import type { QualityScoreBreakdown } from "./types";

/** Coverage breadth is normalized against a first-pass "good coverage"
 *  target of ~5 distinct values per dimension (15 combined) — a
 *  conservative starting point, not a validated benchmark; revisit once
 *  real dataset sizes exist (same "don't guess, validate against data"
 *  rule as every engine threshold in this codebase). */
const BREADTH_TARGET = 15;

export interface DatasetScoreInput {
  distinctExercises: number;
  distinctCameraAngles: number;
  distinctDevices: number;
  labeledFraction: number; // 0..1
}

export function computeDatasetQualityScore(input: DatasetScoreInput): QualityScoreBreakdown {
  const breadth = Math.min(
    1,
    (input.distinctExercises + input.distinctCameraAngles + input.distinctDevices) / BREADTH_TARGET,
  );
  const labeled = Math.max(0, Math.min(1, input.labeledFraction));
  const overall = 0.5 * labeled + 0.5 * breadth;

  return { overall, components: { coverageBreadth: breadth, labeledFraction: labeled } };
}
