import type { QualitativeLevel, RiskCategory, RiskProfile, RiskSensitivity } from "./types";

const LEVEL_RANK: Record<QualitativeLevel, number> = { low: 0, moderate: 1, high: 2 };

export function sensitivity(
  category: RiskCategory,
  level: QualitativeLevel,
  notes?: string,
): RiskSensitivity {
  return { category, sensitivity: level, notes };
}

/** Terse constructor used by exercise-catalog.ts to define a risk profile.
 *  Overall sensitivity is derived as the highest individual sensitivity,
 *  so catalog authors never have to keep it in sync by hand. */
export function risk(sensitivities: RiskSensitivity[]): RiskProfile {
  const overallRiskSensitivity = sensitivities.reduce<QualitativeLevel>(
    (max, s) => (LEVEL_RANK[s.sensitivity] > LEVEL_RANK[max] ? s.sensitivity : max),
    "low",
  );
  return { sensitivities, overallRiskSensitivity };
}
