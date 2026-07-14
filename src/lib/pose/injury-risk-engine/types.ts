// Shared types for the Injury Risk Engine (IRE). IRE sits above the Form
// and Movement Intelligence Engines in the architecture:
//   Pose Detection -> Rep Engine -> Form Engine -> Movement Engine -> IRE
// It consumes only their already-computed public output (CoachState,
// FormAnalysisSnapshot, MovementAnalysisSnapshot) — never pose landmarks,
// never rep-counter/state-machine/form-rules/calibration internals. See
// ALGORITHM.md "Injury Risk Engine".
//
// Safety: every string surfaced by this engine uses movement-risk wording
// ("elevated movement risk", "fatigue accumulation", "technique
// deterioration", "movement instability") and never the word "injury" or
// any diagnostic phrasing — this is an estimate for coaching purposes, not
// a medical assessment.

import type { TrendDirection } from "../movement-engine/types";

export type { TrendDirection };

export type RiskLevel = "LOW" | "MODERATE" | "HIGH";

export type RiskCategory =
  | "muscularFatigue"
  | "techniqueDegradation"
  | "jointInstability"
  | "compensationAccumulation"
  | "movementInconsistency"
  | "asymmetry"
  | "highVelocityLoss"
  | "recoveryDeficit"
  | "repeatedFormBreakdown"
  | "increasingIssueFrequency";

/** One category's contribution to the overall risk score. */
export interface RiskFactor {
  category: RiskCategory;
  score: number; // 0..100
  note: string;
}

export type RecommendedAction =
  | "continue"
  | "reduceLoad"
  | "increaseRest"
  | "stopExercise"
  | "focusOnTechnique"
  | "slowEccentric"
  | "reduceRom"
  | "stretch"
  | "hydrate"
  | "endWorkout";

export interface RiskRecommendation {
  action: RecommendedAction;
  text: string;
  priority: number;
}

/** Per-call output of InjuryRiskEngine.analyzeFrame(). */
export interface RiskSnapshot {
  overallRisk: RiskLevel;
  riskScore: number; // 0..100
  confidence: number; // 0..1
  factors: RiskFactor[]; // ranked highest-score first
  topReasons: string[]; // up to 3, human-readable
  recommendation: RiskRecommendation | null;
  fatigueScore: number; // 0..100
  loadScore: number; // 0..100
  at: number;
}

export interface RiskTimelineEntry {
  t: number;
  riskScore: number;
  level: RiskLevel;
}

export interface RecommendationHistoryEntry {
  at: number;
  action: RecommendedAction;
  text: string;
}

/** End-of-session rollup — attached to SessionResult.injuryRiskAnalysis and
 *  to the debug/CSV exports. */
export interface SessionRiskSummary {
  riskTimeline: RiskTimelineEntry[];
  highestRisk: number;
  averageRisk: number;
  riskTrend: TrendDirection;
  mostCommonCauses: RiskCategory[];
  recommendationHistory: RecommendationHistoryEntry[];
}
