import type { QualitativeLevel, SymmetryProfile } from "./types";

/** Terse constructor used by exercise-catalog.ts to define a symmetry profile. */
export function symmetry(
  expectedSymmetry: QualitativeLevel | "not-applicable",
  isUnilateralCapable: boolean,
  notes?: string,
): SymmetryProfile {
  return { expectedSymmetry, isUnilateralCapable, notes };
}
