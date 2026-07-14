// One recommendation at a time, 30s cooldown (longer than the Movement
// Engine's 25s coaching cooldown — this is a higher-level, less frequent
// signal). All copy uses movement-risk wording, never diagnostic language.

import type { RecommendedAction, RiskCategory, RiskFactor, RiskLevel, RiskRecommendation } from "./types";

const COOLDOWN_MS = 30000;

const ACTION_TEXT: Record<RecommendedAction, string> = {
  continue: "Movement risk is low — continue as planned.",
  reduceLoad: "Consider reducing the load — elevated movement risk detected.",
  increaseRest: "Take a bit more rest before your next set — fatigue accumulation detected.",
  stopExercise: "Consider stopping this exercise — elevated movement risk detected.",
  focusOnTechnique: "Slow down and focus on technique — technique deterioration detected.",
  slowEccentric: "Control the eccentric (lowering) phase more — movement instability detected.",
  reduceRom: "Consider a slightly reduced range of motion this set.",
  stretch: "A short stretch or mobility break may help right now.",
  hydrate: "Take a moment to hydrate.",
  endWorkout: "Consider ending the workout here — sustained elevated movement risk.",
};

const CATEGORY_ACTION: Record<RiskCategory, RecommendedAction> = {
  muscularFatigue: "increaseRest",
  techniqueDegradation: "focusOnTechnique",
  jointInstability: "slowEccentric",
  compensationAccumulation: "reduceRom",
  movementInconsistency: "focusOnTechnique",
  asymmetry: "focusOnTechnique",
  highVelocityLoss: "reduceLoad",
  recoveryDeficit: "increaseRest",
  repeatedFormBreakdown: "focusOnTechnique",
  increasingIssueFrequency: "stopExercise",
};

export function pickRecommendation(
  factors: RiskFactor[],
  overallRisk: RiskLevel,
  lastRecommendationAt: number,
  now: number
): RiskRecommendation | null {
  if (now - lastRecommendationAt < COOLDOWN_MS) return null;
  if (overallRisk === "LOW") return null;

  const top = [...factors].sort((a, b) => b.score - a.score)[0];
  if (!top || top.score <= 0) return null;

  let action = CATEGORY_ACTION[top.category];
  if (overallRisk === "HIGH" && top.score >= 80) action = "endWorkout";

  return { action, text: ACTION_TEXT[action], priority: overallRisk === "HIGH" ? 3 : 2 };
}
