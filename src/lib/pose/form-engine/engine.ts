// FormEngine — the single integration surface for the Form Analysis Engine.
// One instance per trainer session, instantiated the same way RepCounter is
// (see use-pose-trainer.ts). It only ever *reads* CoachState (already
// computed by the Rep Engine each frame) for phase/state context — it never
// calls into RepCounter internals and never counts reps itself.
//
// Per-frame cost: one toMap() pass (RepCounter's internal map isn't exposed,
// so this one redundant pass is an accepted, cheap tradeoff — see
// ALGORITHM.md "Performance"), then simple arithmetic over cached joint
// metrics. No ML inference of its own.

import { toMap, type Keypoint } from "../angles";
import type { CoachState } from "../rep-counter";
import { pickCoachingMessage } from "./coaching";
import { computeJointMetrics, type JointMetrics } from "./joint-metrics";
import { detectGenericIssues } from "./issues";
import { getFormProfile } from "./registry";
import { computeFrameScores } from "./scoring";
import { IssueTracker, RollingMin, RollingRange, RollingStat } from "./temporal-tracker";
import {
  NEUTRAL_SCORES,
  type ExerciseFormProfile,
  type FormAnalysisSnapshot,
  type IssueId,
  type Mode,
  type RawIssue,
  type RepFormSummary,
  type SessionFormSummary,
} from "./types";
import { getWeaknessTrends, recordSessionIssues } from "./weakness-tracking";

/** Issues that only make sense as a one-shot signal at the rep's
 *  LOCKOUT/REP_COMPLETE decision point rather than a continuously-true
 *  condition. Held "sticky" for a short window so the frame-based
 *  IssueTracker (which needs several consecutive frames to trust a signal)
 *  can still recognize them despite the decision itself lasting only 1-2
 *  frames. */
const ONE_SHOT_IDS = new Set<IssueId>(["incompleteLockout", "partialRange"]);
const STICKY_WINDOW_MS = 650;
const SCORE_SAMPLE_INTERVAL_MS = 1000;

export class FormEngine {
  private poseKey: string | null;
  private mode: Mode;
  private profile: ExerciseFormProfile | null;

  private tracker = new IssueTracker();
  private hipSway = new RollingStat(45);
  private leanSway = new RollingStat(45);
  private heelBaseline = { left: new RollingMin(), right: new RollingMin() };
  private toeBaseline = { left: new RollingMin(), right: new RollingMin() };
  private wristRange = { left: new RollingRange(), right: new RollingRange() };
  private stickyOneShot = new Map<IssueId, { sample: RawIssue; expiresAt: number }>();

  private lastScores = NEUTRAL_SCORES;
  private lastScoreSampleAt = 0;
  private scoreHistory: { t: number; scores: typeof NEUTRAL_SCORES }[] = [];
  private reps: RepFormSummary[] = [];
  private currentRepIssueIds = new Set<IssueId>();
  private lastRepState = "WAITING";
  private lastCoachAt: Record<string, number> = {};
  private lastGlobalCoachAt = 0;

  constructor(poseKey?: string | null, mode: Mode = "beginner") {
    this.poseKey = poseKey ?? null;
    this.mode = mode;
    this.profile = getFormProfile(poseKey);
  }

  analyzeFrame(
    kp2D: Keypoint[],
    kp3D: Keypoint[] | null | undefined,
    coachState: CoachState,
    now: number
  ): FormAnalysisSnapshot {
    const map2D = toMap(kp2D);
    const map3D = kp3D && kp3D.length ? toMap(kp3D) : null;
    const metrics = computeJointMetrics(map2D, map3D);

    if (metrics.hipOffsetFromAnkleNorm != null) this.hipSway.push(metrics.hipOffsetFromAnkleNorm);
    if (metrics.torsoLeanDeg != null) this.leanSway.push(metrics.torsoLeanDeg);
    if (metrics.heelAboveAnkleNorm.left != null) this.heelBaseline.left.push(metrics.heelAboveAnkleNorm.left);
    if (metrics.heelAboveAnkleNorm.right != null) this.heelBaseline.right.push(metrics.heelAboveAnkleNorm.right);
    if (metrics.toeAboveAnkleNorm.left != null) this.toeBaseline.left.push(metrics.toeAboveAnkleNorm.left);
    if (metrics.toeAboveAnkleNorm.right != null) this.toeBaseline.right.push(metrics.toeAboveAnkleNorm.right);
    if (metrics.wristX.left != null) this.wristRange.left.push(metrics.wristX.left);
    if (metrics.wristX.right != null) this.wristRange.right.push(metrics.wristX.right);

    const sway = { hipSwayStdDev: this.hipSway.stdDev, leanStdDev: this.leanSway.stdDev };
    const generic = detectGenericIssues(
      metrics,
      sway,
      { left: this.heelBaseline.left.min, right: this.heelBaseline.right.min },
      { left: this.toeBaseline.left.min, right: this.toeBaseline.right.min },
      this.mode
    );

    let progressGap: number | null = null;
    if (coachState.debug.state === "LOCKOUT" || coachState.debug.state === "REP_COMPLETE") {
      progressGap = Math.max(0, coachState.debug.requiredProgress - coachState.debug.peak);
    }
    const torsoNorm = metrics.torsoLengthPx || null;
    const wristDriftNorm = {
      left: torsoNorm ? (this.wristRange.left.range ?? 0) / torsoNorm : null,
      right: torsoNorm ? (this.wristRange.right.range ?? 0) / torsoNorm : null,
    };

    const specific = this.profile
      ? this.profile.detect({
          metrics,
          mode: this.mode,
          repPhase: coachState.repPhase,
          repState: coachState.debug.state,
          progressGap,
          wristDriftNorm,
        })
      : [];

    const samples = this.applyStickyOneShots(generic, specific, now);
    const active = this.tracker.update(samples, now);
    for (const issue of active) this.currentRepIssueIds.add(issue.id);

    const scores = computeFrameScores(active, coachState, sway);
    this.lastScores = scores;
    if (now - this.lastScoreSampleAt >= SCORE_SAMPLE_INTERVAL_MS) {
      this.scoreHistory.push({ t: now, scores });
      this.lastScoreSampleAt = now;
      if (this.scoreHistory.length > 600) this.scoreHistory.shift();
    }

    if (coachState.debug.state === "REP_COMPLETE" && this.lastRepState !== "REP_COMPLETE") {
      this.sealRep(coachState, now);
    }
    this.lastRepState = coachState.debug.state;

    const coaching = pickCoachingMessage(active, this.lastCoachAt, this.lastGlobalCoachAt, now);
    if (coaching) {
      this.lastCoachAt[coaching.issueId ?? coaching.text] = now;
      this.lastGlobalCoachAt = now;
    }

    return {
      activeIssues: active,
      scores,
      phase: coachState.repPhase,
      repState: coachState.debug.state,
      coaching,
      confidence: metrics.confidence,
      metrics,
      sway,
    };
  }

  private applyStickyOneShots(generic: RawIssue[], specific: RawIssue[], now: number): RawIssue[] {
    for (const issue of specific) {
      if (ONE_SHOT_IDS.has(issue.id)) {
        this.stickyOneShot.set(issue.id, { sample: issue, expiresAt: now + STICKY_WINDOW_MS });
      }
    }
    const nonOneShot = specific.filter((i) => !ONE_SHOT_IDS.has(i.id));
    const sticky: RawIssue[] = [];
    for (const [id, entry] of this.stickyOneShot) {
      if (entry.expiresAt >= now) sticky.push(entry.sample);
      else this.stickyOneShot.delete(id);
    }
    return [...generic, ...nonOneShot, ...sticky];
  }

  private sealRep(coachState: CoachState, now: number) {
    this.reps.push({
      repNumber: coachState.reps + coachState.invalidReps,
      at: now,
      scores: this.lastScores,
      issues: Array.from(this.currentRepIssueIds),
    });
    this.currentRepIssueIds.clear();
    this.wristRange.left.reset();
    this.wristRange.right.reset();
  }

  getSessionSummary(): SessionFormSummary {
    const issueLog = this.tracker.finalize(Date.now());
    recordSessionIssues(this.poseKey, issueLog);

    const rank = (id: IssueId) => {
      const entries = issueLog.filter((e) => e.id === id);
      return entries.reduce((s, e) => s + e.occurrences * (0.5 + e.peakMagnitude), 0);
    };
    const topIssues = Array.from(new Set(issueLog.map((e) => e.id)))
      .sort((a, b) => rank(b) - rank(a))
      .slice(0, 3);

    return {
      scores: this.lastScores,
      scoreHistory: this.scoreHistory,
      reps: this.reps,
      issueLog,
      topIssues,
      weaknesses: getWeaknessTrends(this.poseKey),
      hasExerciseProfile: this.profile != null,
    };
  }
}

export type { JointMetrics };
