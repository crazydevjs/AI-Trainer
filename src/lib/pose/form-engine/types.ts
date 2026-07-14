// Shared types for the Form Analysis Engine. This engine is read-only with
// respect to the Rep Engine (rep-counter.ts), State Machine (state-machine.ts)
// and Calibration Engine (calibration.ts) — it consumes their already-exported
// telemetry (CoachState) but never mutates or re-implements their logic.
// See ALGORITHM.md "Form Analysis Engine" and DEVELOPER_GUIDE.md.

import type { Mode, Orientation } from "../form-rules";

export type { Mode, Orientation };

/** Every technique fault the engine can recognize. Not every exercise profile
 *  uses every id — see src/lib/pose/form-engine/exercises/*.ts. */
export type IssueId =
  | "roundedBack"
  | "overextendedBack"
  | "forwardLean"
  | "hipShift"
  | "unevenHips"
  | "unevenShoulders"
  | "kneeValgus"
  | "kneeVarus"
  | "heelLift"
  | "toeLift"
  | "elbowFlare"
  | "elbowsTooNarrow"
  | "shoulderElevation"
  | "incompleteLockout"
  | "partialRange"
  | "weightShift"
  | "torsoRotation"
  | "headLookingDown"
  | "neckMisalignment"
  | "lossOfBalance"
  | "coreInstability"
  | "barPathDeviation";

export type Severity = "minor" | "moderate" | "major" | "critical";

export type IssueStatus = "started" | "ongoing" | "resolved";

/** A single frame's raw evidence for an issue, before temporal smoothing.
 *  magnitude is 0..1 — how far past the fault threshold the measurement is
 *  (0 = right at the line, 1 = extreme), not a confidence value. */
export interface RawIssue {
  id: IssueId;
  magnitude: number;
  confidence: number; // 0..1 — pose/keypoint confidence backing this reading
  affectedJoints: string[];
  correction: string;
}

/** A temporally-smoothed, currently-relevant issue — what the HUD/coaching/
 *  export layers consume. Built by temporal-tracker.ts from RawIssue samples. */
export interface DetectedIssue {
  id: IssueId;
  status: IssueStatus;
  severity: Severity;
  confidence: number; // 0..1, averaged while active
  magnitude: number; // 0..1, averaged while active
  affectedJoints: string[];
  correction: string;
  firstSeenAt: number;
  durationMs: number;
  occurrences: number; // started->resolved cycles this session, including this one
}

/** A resolved-or-still-open issue kept for the session's issue log / export. */
export interface IssueLogEntry {
  id: IssueId;
  severity: Severity;
  firstSeenAt: number;
  resolvedAt: number | null;
  durationMs: number;
  occurrences: number;
  peakMagnitude: number;
  avgConfidence: number;
}

export interface FormScores {
  joint: number;
  alignment: number;
  balance: number;
  rom: number;
  stability: number;
  movementQuality: number;
  technique: number;
  overall: number;
}

export interface CoachMessage {
  text: string;
  tone: "correct" | "praise" | "info";
  issueId?: IssueId;
  priority: number;
}

/** Per-frame output of FormEngine.analyzeFrame(). */
export interface FormAnalysisSnapshot {
  activeIssues: DetectedIssue[];
  scores: FormScores;
  phase: "idle" | "down" | "up";
  repState: string;
  coaching: CoachMessage | null;
  confidence: number; // 0..1, this frame's joint-metric confidence
  /** This frame's already-computed joint geometry — exposed so downstream
   *  consumers (the Movement Intelligence Engine) can reuse it instead of
   *  re-deriving from pose landmarks. See ALGORITHM.md "Movement
   *  Intelligence Engine". */
  metrics: import("./joint-metrics").JointMetrics;
  /** Form Engine's own rolling sway variance, already computed for its
   *  Balance/Stability scores — exposed for the same reuse-not-duplicate
   *  reason as `metrics`. */
  sway: { hipSwayStdDev: number | null; leanStdDev: number | null };
}

/** Sealed once per completed rep (see FormEngine.onRepComplete). */
export interface RepFormSummary {
  repNumber: number;
  at: number;
  scores: FormScores;
  issues: IssueId[];
}

export interface WeaknessTrend {
  id: IssueId;
  count: number;
  lastSeenAt: number;
}

/** End-of-session rollup — attached to SessionResult.formAnalysis and to the
 *  debug/CSV exports. */
export interface SessionFormSummary {
  scores: FormScores;
  scoreHistory: { t: number; scores: FormScores }[];
  reps: RepFormSummary[];
  issueLog: IssueLogEntry[];
  topIssues: IssueId[];
  weaknesses: WeaknessTrend[];
  /** Whether this session had any exercise-specific detectors (vs. generic
   *  joint/balance analysis only) — surfaced so the UI can be honest about
   *  coverage depth (see "Scientific Accuracy" in ALGORITHM.md). */
  hasExerciseProfile: boolean;
}

/** One entry per exercise family (squat, bench press, ...). Each profile
 *  layers its own expected-movement checks on top of the generic detectors
 *  in issues.ts — see DEVELOPER_GUIDE.md "Adding a new exercise". */
export interface ExerciseFormProfile {
  /** Human-readable summary of the expected movement model, surfaced in the
   *  dev HUD / docs — not used for detection logic. */
  expectedModel: string;
  detect(ctx: ExerciseDetectContext): RawIssue[];
}

export interface ExerciseDetectContext {
  metrics: import("./joint-metrics").JointMetrics;
  mode: Mode;
  repPhase: "idle" | "down" | "up";
  repState: string;
  /** 0..1 shortfall between the Rep Engine's required turnaround progress and
   *  the peak actually reached (RepDebugInfo.requiredProgress - peak, floored
   *  at 0), sampled at the LOCKOUT/REP_COMPLETE decision — null on every other
   *  frame. Read-only telemetry from the Rep Engine, not re-derived here. */
  progressGap: number | null;
  /** Horizontal wrist drift since the last rep boundary, normalized by torso
   *  length (0 = perfectly vertical bar path). Estimated from wrist
   *  trajectory since the bar itself isn't visible to the pose model. */
  wristDriftNorm: { left: number | null; right: number | null };
}

export const NEUTRAL_SCORES: FormScores = {
  joint: 100,
  alignment: 100,
  balance: 100,
  rom: 100,
  stability: 100,
  movementQuality: 100,
  technique: 100,
  overall: 100,
};
