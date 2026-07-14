// Shared types for the Movement Intelligence Engine (MIE). MIE consumes the
// Calibration Engine, State Machine, and Form Analysis Engine's already-
// computed output (CoachState, FormAnalysisSnapshot, SessionFormSummary) —
// it never touches pose landmarks itself. See ALGORITHM.md "Movement
// Intelligence Engine" and DEVELOPER_GUIDE.md.

import type { IssueId } from "../form-engine/types";

export type { IssueId };

/** Body region a compensation pattern is attributed to. Describes observed
 *  co-occurring movement behavior, not a diagnosis — see "Scientific
 *  accuracy" in ALGORITHM.md. */
export type CompensationId =
  | "hipCompensation"
  | "shoulderCompensation"
  | "backCompensation"
  | "kneeCompensation"
  | "neckCompensation"
  | "ankleCompensation"
  | "coreCompensation";

export type TrendDirection = "improving" | "degrading" | "stable" | "insufficient-data";

export interface MovementScores {
  smoothness: number;
  control: number;
  coordination: number;
  symmetry: number;
  consistency: number;
  stability: number;
  efficiency: number;
  overall: number;
}

export const NEUTRAL_MOVEMENT_SCORES: MovementScores = {
  smoothness: 100,
  control: 100,
  coordination: 100,
  symmetry: 100,
  consistency: 100,
  stability: 100,
  efficiency: 100,
  overall: 100,
};

/** A detected co-occurrence between issues that plausibly indicates one body
 *  region compensating for a limitation elsewhere — see compensation.ts. */
export interface CompensationEvent {
  id: CompensationId;
  region: string;
  triggerIssues: IssueId[];
  confidence: number; // 0..1
  at: number;
  note: string;
}

export interface MovementCoachMessage {
  text: string;
  tone: "info" | "correct" | "praise";
  priority: number;
}

/** Per-frame output of MovementEngine.analyzeFrame(). */
export interface MovementAnalysisSnapshot {
  scores: MovementScores;
  velocity: number | null; // progress units / second, signed
  acceleration: number | null; // progress units / second^2
  jerk: number | null; // rate of acceleration change — smoothness proxy
  activeCompensations: CompensationEvent[];
  dominantSide: "left" | "right" | null;
  coaching: MovementCoachMessage | null;
}

export interface ConsistencySummary {
  consistencyScore: number; // 0..100
  repToRepDrift: number | null; // avg abs delta between consecutive reps' overall form score
  earlyVsLateDrift: number | null; // first-third vs last-third avg form score delta (negative = declined)
  techniqueDrift: TrendDirection;
  romDrift: TrendDirection;
  tempoDrift: TrendDirection;
  stabilityDrift: TrendDirection;
  notes: string[];
}

export interface SymmetrySummary {
  symmetryScore: number; // 0..100
  dominantSide: "left" | "right" | null;
  asymmetryConfidence: number; // 0..1
  notes: string[];
}

export interface CompensationSummary {
  events: CompensationEvent[];
  regionCounts: Partial<Record<CompensationId, number>>;
  notes: string[];
}

export interface TrendSummary {
  overall: TrendDirection;
  perScore: Partial<Record<keyof MovementScores, TrendDirection>>;
  notes: string[];
}

/** End-of-session rollup — attached to SessionResult.movementAnalysis and to
 *  the debug/CSV exports. */
export interface SessionMovementSummary {
  scores: MovementScores;
  scoreHistory: { t: number; scores: MovementScores }[];
  strengths: string[];
  weaknesses: string[];
  consistency: ConsistencySummary;
  symmetry: SymmetrySummary;
  compensation: CompensationSummary;
  trend: TrendSummary;
  focusAreas: string[];
}
