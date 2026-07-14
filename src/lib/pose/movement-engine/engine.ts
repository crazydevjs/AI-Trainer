// MovementEngine — the single integration surface for the Movement
// Intelligence Engine. One instance per trainer session, instantiated the
// same way FormEngine/RepCounter are (see use-pose-trainer.ts). It never
// touches pose landmarks: analyzeFrame() consumes CoachState (Rep Engine /
// State Machine telemetry) and FormAnalysisSnapshot (Form Engine's already-
// computed joint metrics, sway stats, and active issues) — see
// ALGORITHM.md "Movement Intelligence Engine" for the full data-flow.

import type { CoachState } from "../rep-counter";
import { RollingMin, RollingStat } from "../form-engine/temporal-tracker";
import type { FormAnalysisSnapshot, SessionFormSummary } from "../form-engine/types";
import { matchCompensations, summarizeCompensation } from "./compensation";
import { summarizeConsistency } from "./consistency";
import { KinematicsTracker } from "./kinematics";
import { computeFrameMovementScores } from "./scoring";
import { sampleSymmetry, summarizeSymmetry } from "./symmetry";
import { pickMovementCoachingMessage } from "./coaching";
import { summarizeTrend } from "./trend";
import {
  NEUTRAL_MOVEMENT_SCORES,
  type CompensationEvent,
  type CompensationSummary,
  type MovementAnalysisSnapshot,
  type MovementScores,
  type SessionMovementSummary,
} from "./types";

const COMPENSATION_COOLDOWN_MS = 8000;
const RECENT_COMPENSATION_WINDOW_MS = 5000;
const SCORE_SAMPLE_INTERVAL_MS = 1000;
const MAX_COMPENSATION_LOG = 300;

const SCORE_LABELS: Record<Exclude<keyof MovementScores, "overall">, string> = {
  smoothness: "Movement smoothness",
  control: "Movement control",
  coordination: "Joint coordination",
  symmetry: "Left/right symmetry",
  consistency: "Rep-to-rep consistency",
  stability: "Stability",
  efficiency: "Movement efficiency",
};

export class MovementEngine {
  private kinematics = new KinematicsTracker();
  private jerkStat = new RollingStat(60);
  private kneeDiffStat = new RollingStat(90);
  private elbowDiffStat = new RollingStat(90);
  private kneeMin = { left: new RollingMin(), right: new RollingMin() };
  private elbowMin = { left: new RollingMin(), right: new RollingMin() };

  private compensationEvents: CompensationEvent[] = [];
  private lastCompensationAt: Partial<Record<string, number>> = {};

  private lastScores: MovementScores = NEUTRAL_MOVEMENT_SCORES;
  private scoreHistory: { t: number; scores: MovementScores }[] = [];
  private lastScoreSampleAt = 0;
  private lastGlobalCoachAt = 0;

  analyzeFrame(coachState: CoachState, formSnapshot: FormAnalysisSnapshot, now: number): MovementAnalysisSnapshot {
    const kin = this.kinematics.update(coachState.progress, now);
    if (kin.jerk != null) this.jerkStat.push(Math.abs(kin.jerk));

    const sym = sampleSymmetry(formSnapshot.metrics);
    if (sym.kneeDiffDeg != null) this.kneeDiffStat.push(sym.kneeDiffDeg);
    if (sym.elbowDiffDeg != null) this.elbowDiffStat.push(sym.elbowDiffDeg);
    const { left: lk, right: rk } = formSnapshot.metrics.kneeAngleDeg;
    if (lk != null) this.kneeMin.left.push(lk);
    if (rk != null) this.kneeMin.right.push(rk);
    const { left: le, right: re } = formSnapshot.metrics.elbowAngleDeg;
    if (le != null) this.elbowMin.left.push(le);
    if (re != null) this.elbowMin.right.push(re);

    for (const match of matchCompensations(formSnapshot.activeIssues)) {
      const last = this.lastCompensationAt[match.id] ?? 0;
      if (now - last < COMPENSATION_COOLDOWN_MS) continue;
      this.lastCompensationAt[match.id] = now;
      this.compensationEvents.push({ ...match, at: now });
      if (this.compensationEvents.length > MAX_COMPENSATION_LOG) this.compensationEvents.shift();
    }
    const recentCompensations = this.compensationEvents.filter(
      (e) => now - e.at < RECENT_COMPENSATION_WINDOW_MS
    );

    const symSummary = summarizeSymmetry(this.kneeDiffStat, this.elbowDiffStat, this.kneeMin, this.elbowMin);

    const scores = computeFrameMovementScores({
      jerkStat: this.jerkStat,
      kneeDiffStat: this.kneeDiffStat,
      elbowDiffStat: this.elbowDiffStat,
      sway: formSnapshot.sway,
      activeIssues: formSnapshot.activeIssues,
      recentCompensationCount: recentCompensations.length,
    });
    this.lastScores = scores;
    if (now - this.lastScoreSampleAt >= SCORE_SAMPLE_INTERVAL_MS) {
      this.scoreHistory.push({ t: now, scores });
      this.lastScoreSampleAt = now;
      if (this.scoreHistory.length > 600) this.scoreHistory.shift();
    }

    const coaching = pickMovementCoachingMessage(
      scores,
      recentCompensations,
      symSummary.dominantSide,
      this.lastGlobalCoachAt,
      now
    );
    if (coaching) this.lastGlobalCoachAt = now;

    return {
      scores,
      velocity: kin.velocity,
      acceleration: kin.acceleration,
      jerk: kin.jerk,
      activeCompensations: recentCompensations,
      dominantSide: symSummary.dominantSide,
      coaching,
    };
  }

  getSessionSummary(formSessionSummary: SessionFormSummary): SessionMovementSummary {
    const consistency = summarizeConsistency(formSessionSummary.reps);
    const symmetry = summarizeSymmetry(this.kneeDiffStat, this.elbowDiffStat, this.kneeMin, this.elbowMin);
    const compensation = summarizeCompensation(this.compensationEvents);
    const trend = summarizeTrend(
      formSessionSummary.scoreHistory.map((h) => h.scores.overall),
      this.scoreHistory
    );

    const { strengths, weaknesses } = buildStrengthsWeaknesses(this.lastScores);
    const focusAreas = buildFocusAreas(this.lastScores, compensation);

    return {
      scores: this.lastScores,
      scoreHistory: this.scoreHistory,
      strengths,
      weaknesses,
      consistency,
      symmetry,
      compensation,
      trend,
      focusAreas,
    };
  }
}

function buildStrengthsWeaknesses(scores: MovementScores): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const key of Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]) {
    const v = scores[key];
    if (v >= 85) strengths.push(SCORE_LABELS[key]);
    else if (v <= 60) weaknesses.push(SCORE_LABELS[key]);
  }
  return { strengths, weaknesses };
}

function buildFocusAreas(scores: MovementScores, compensation: CompensationSummary): string[] {
  const ranked = (Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[])
    .sort((a, b) => scores[a] - scores[b])
    .slice(0, 2)
    .map((k) => SCORE_LABELS[k]);
  const out = [...ranked];
  if (compensation.notes[0]) out.push(compensation.notes[0]);
  return out;
}
