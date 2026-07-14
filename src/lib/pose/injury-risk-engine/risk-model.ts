// The core risk model: one 0-100 RiskFactor per category, then a weighted
// combination into an overall score/level. Every input here is either
// already-computed Form/Movement Engine output or this engine's own
// RiskHistory accumulator — never a pose landmark.

import type { FormScores } from "../form-engine/types";
import type { MovementScores } from "../movement-engine/types";
import type { RiskHistory } from "./history";
import type { RiskCategory, RiskFactor, RiskLevel } from "./types";

function factor(category: RiskCategory, score: number, note: string): RiskFactor {
  return { category, score: Math.max(0, Math.min(100, Math.round(score))), note };
}

function stdDev(values: number[]): number | null {
  if (values.length < 3) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** % drop from the early-set average peak velocity to the late-set average,
 *  scaled into a 0-100 score. */
function computeVelocityLoss(velocities: number[]): number {
  if (velocities.length < 4) return 0;
  const third = Math.max(1, Math.floor(velocities.length / 3));
  const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const early = avg(velocities.slice(0, third));
  const late = avg(velocities.slice(-third));
  if (early <= 0) return 0;
  const lossPct = ((early - late) / early) * 100;
  return Math.max(0, Math.min(100, lossPct * 2));
}

export function computeRiskFactors(
  history: RiskHistory,
  formScores: FormScores,
  movementScores: MovementScores | null,
  activeCompensationCount: number,
  secondsSinceLastRep: number | null,
  fatigueScore: number
): RiskFactor[] {
  const factors: RiskFactor[] = [];

  factors.push(
    factor("muscularFatigue", fatigueScore, "Fatigue accumulation from rep pace and score trend.")
  );

  factors.push(
    factor(
      "techniqueDegradation",
      100 - formScores.technique,
      "Technique deterioration relative to ideal form."
    )
  );

  const stabilityFloor = Math.min(formScores.stability, movementScores?.stability ?? 100);
  factors.push(factor("jointInstability", 100 - stabilityFloor, "Movement instability around working joints."));

  const compensationTally = Array.from(history.getCompensationOccurrences().values()).reduce(
    (a, b) => a + b,
    0
  );
  factors.push(
    factor(
      "compensationAccumulation",
      activeCompensationCount * 30 + compensationTally * 8,
      "Repeated compensation patterns across reps."
    )
  );

  const repVariance = stdDev(history.getRepScores());
  factors.push(
    factor(
      "movementInconsistency",
      (repVariance ?? 0) * 4,
      "Inconsistent movement quality between reps."
    )
  );

  factors.push(
    factor("asymmetry", 100 - (movementScores?.symmetry ?? 100), "Left/right asymmetry in movement pattern.")
  );

  factors.push(
    factor(
      "highVelocityLoss",
      computeVelocityLoss(history.getPeakVelocities()),
      "Declining rep speed/power output."
    )
  );

  const recoveryDeficit =
    secondsSinceLastRep != null && secondsSinceLastRep < 8 ? (8 - secondsSinceLastRep) * 12 : 0;
  factors.push(
    factor("recoveryDeficit", recoveryDeficit, "Limited recovery time between reps or sets.")
  );

  const issueOccurrences = history.getIssueOccurrences();
  const worstRepeat = issueOccurrences.size ? Math.max(...issueOccurrences.values()) : 0;
  factors.push(
    factor(
      "repeatedFormBreakdown",
      worstRepeat * 20,
      "The same technique issue recurring across multiple reps."
    )
  );

  const totalIssueEvents = Array.from(issueOccurrences.values()).reduce((a, b) => a + b, 0);
  const issueRate = history.repCount > 0 ? (totalIssueEvents / history.repCount) * 40 : 0;
  factors.push(
    factor("increasingIssueFrequency", issueRate, "Rising frequency of detected technique issues.")
  );

  return factors;
}

const WEIGHTS: Record<RiskCategory, number> = {
  muscularFatigue: 0.15,
  techniqueDegradation: 0.15,
  jointInstability: 0.12,
  compensationAccumulation: 0.12,
  movementInconsistency: 0.1,
  asymmetry: 0.08,
  highVelocityLoss: 0.08,
  recoveryDeficit: 0.08,
  repeatedFormBreakdown: 0.06,
  increasingIssueFrequency: 0.06,
};

export function combineRisk(factors: RiskFactor[]): {
  riskScore: number;
  overallRisk: RiskLevel;
  topReasons: string[];
} {
  let weighted = 0;
  for (const f of factors) weighted += f.score * (WEIGHTS[f.category] ?? 0);
  const riskScore = Math.max(0, Math.min(100, Math.round(weighted)));

  const overallRisk: RiskLevel = riskScore >= 65 ? "HIGH" : riskScore >= 35 ? "MODERATE" : "LOW";

  const topReasons = [...factors]
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((f) => f.note);

  return { riskScore, overallRisk, topReasons };
}
