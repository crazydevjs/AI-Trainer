import {
  angle,
  angleFromVertical,
  bestSide,
  toMap,
  type Keypoint,
  type KeypointMap,
} from "./angles";
import type { ExerciseConfig, RepConfig, PostureRule } from "./exercises";

export type CoachEvent =
  | { type: "rep"; reps: number; rom: number; form: number; quality: "perfect" | "good" }
  // a movement was attempted but rejected (didn't meet ROM/form) — NOT counted
  | { type: "badrep"; reason: string }
  // live coaching while moving (corrections + encouragement)
  | { type: "cue"; message: string; tone: "correct" | "praise" };

export interface CoachState {
  reps: number;
  holdSeconds: number;
  /** 0..1 toward the required depth — drives the live HUD ring */
  progress: number;
  avgRom: number | null;
  avgForm: number | null;
  formOk: boolean;
  tracking: boolean;
  /** true while the user is mid-rep (descended past the start) */
  inMotion: boolean;
}

// --- tuning ---
const ENTER = 0.35; // progress to consider a rep "started"
const EXIT = 0.15; // progress to consider returned to the top
const DEPTH_FRAMES = 2; // consecutive frames at depth before it's validated
const REVERSAL = 0.18; // progress drop that signals coming up early
const FORM_GATE = 45; // below this form score a rep is rejected
const MIN_CONF = 0.3; // keypoint confidence floor
const SMOOTH = 0.5; // angle EMA factor

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

function postureMetric(map: KeypointMap, side: string, rule: PostureRule) {
  const sh = map[`${side}_shoulder`];
  const hip = map[`${side}_hip`];
  if (rule.kind === "torsoUpright") {
    if (!sh || !hip) return { ok: true, value: 0 };
    const lean = angleFromVertical(sh, hip);
    return { ok: lean <= rule.threshold, value: lean };
  }
  const knee = map[`${side}_knee`];
  if (!sh || !hip || !knee) return { ok: true, value: 180 };
  const a = angle(sh, hip, knee);
  return { ok: a >= rule.threshold, value: a };
}

export class RepCounter {
  private cfg: ExerciseConfig;
  reps = 0;
  holdSeconds = 0;

  // rep-mode state
  private inAttempt = false;
  private maxProgress = 0;
  private framesAtDepth = 0;
  private reachedDepth = false;
  private warnedDepth = false;
  private warnedPosture = false;
  private worstForm = 0;
  private smoothAngle = NaN;
  private progress = 0;
  private formOk = true;
  private tracking = false;
  private lastRepTs = 0;
  private lastTs = 0;
  private lastCueTs = 0;

  private romScores: number[] = [];
  private formScores: number[] = [];

  // hold/generic state
  private gPhase: "up" | "down" = "up";
  private gBaseline = 0;
  private holdPraiseAt = 0;

  constructor(cfg: ExerciseConfig) {
    this.cfg = cfg;
  }

  private throttleCue(now: number, gap = 1500): boolean {
    if (now - this.lastCueTs < gap) return false;
    this.lastCueTs = now;
    return true;
  }

  update(rawKeypoints: Keypoint[], now: number): CoachEvent[] {
    const dt = this.lastTs ? (now - this.lastTs) / 1000 : 0;
    this.lastTs = now;
    const map = toMap(rawKeypoints);

    if (this.cfg.type === "generic") return this.updateGeneric(map, now);
    if (this.cfg.type === "hold") return this.updateHold(map, dt, now);
    return this.updateRep(this.cfg, map, now);
  }

  private updateRep(cfg: RepConfig, map: KeypointMap, now: number): CoachEvent[] {
    const events: CoachEvent[] = [];
    const side = bestSide(
      map,
      cfg.joint.map((j) => `left_${j}`),
      cfg.joint.map((j) => `right_${j}`)
    );
    this.tracking = side !== null;
    if (!side) return events;

    const pts = cfg.joint.map((j) => map[`${side}_${j}`]) as Keypoint[];
    if (pts.some((p) => !p || (p.score ?? 0) < MIN_CONF)) {
      this.tracking = false;
      return events; // ignore low-confidence frames (anti-jitter)
    }

    // smoothed primary angle
    const raw = angle(pts[0], pts[1], pts[2]);
    this.smoothAngle = isNaN(this.smoothAngle)
      ? raw
      : this.smoothAngle * (1 - SMOOTH) + raw * SMOOTH;
    const ang = this.smoothAngle;

    // unified directional progress: 0 at start, 1 at required depth, >1 deeper
    const progress = (ang - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);
    this.progress = clamp(progress);

    // posture sampling (live)
    let postureValue = cfg.posture?.kind === "torsoUpright" ? 0 : 180;
    if (cfg.posture) {
      const m = postureMetric(map, side, cfg.posture);
      this.formOk = m.ok;
      postureValue = m.value;
    }

    if (!this.inAttempt) {
      // start a rep attempt once clearly descending from the top
      if (progress > ENTER) {
        this.inAttempt = true;
        this.maxProgress = progress;
        this.framesAtDepth = 0;
        this.reachedDepth = false;
        this.warnedDepth = false;
        this.warnedPosture = false;
        this.worstForm = postureValue;
      }
      return events;
    }

    // --- in an attempt ---
    this.maxProgress = Math.max(this.maxProgress, progress);

    // track worst posture during the rep
    if (cfg.posture) {
      this.worstForm =
        cfg.posture.kind === "torsoUpright"
          ? Math.max(this.worstForm, postureValue)
          : Math.min(this.worstForm, postureValue);
      // live posture correction mid-rep
      if (!this.formOk && !this.warnedPosture && progress > 0.4 && this.throttleCue(now)) {
        this.warnedPosture = true;
        events.push({ type: "cue", message: cfg.posture.cue, tone: "correct" });
      }
    }

    // depth validation with multi-frame stability (anti-jitter)
    if (progress >= 1) {
      this.framesAtDepth += 1;
      if (this.framesAtDepth >= DEPTH_FRAMES) this.reachedDepth = true;
    } else {
      this.framesAtDepth = 0;
    }

    // coming back up before reaching depth → coach immediately
    if (
      !this.reachedDepth &&
      !this.warnedDepth &&
      progress < this.maxProgress - REVERSAL &&
      this.maxProgress < 1
    ) {
      this.warnedDepth = true;
      if (this.throttleCue(now, 1200)) {
        events.push({ type: "cue", message: cfg.incompleteCue, tone: "correct" });
      }
    }

    // attempt ends when returned to the top
    if (progress < EXIT) {
      this.inAttempt = false;
      this.progress = 0;
      const tooFast = this.lastRepTs > 0 && now - this.lastRepTs < 700;

      // form score from worst posture seen
      let form = 100;
      if (cfg.posture) {
        form =
          cfg.posture.kind === "torsoUpright"
            ? Math.round(clamp(1 - (this.worstForm - cfg.posture.threshold) / 60) * 100)
            : Math.round(clamp(1 - (cfg.posture.threshold - this.worstForm) / 50) * 100);
        form = Math.max(0, Math.min(100, form));
      }

      // REJECT: insufficient depth
      if (!this.reachedDepth) {
        events.push({ type: "badrep", reason: cfg.incompleteCue });
        return events;
      }
      // REJECT: depth ok but form unacceptable
      if (cfg.posture && form < FORM_GATE) {
        events.push({ type: "badrep", reason: cfg.posture.cue });
        return events;
      }

      // VALID REP
      const idealProgress =
        (cfg.idealAngle - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);
      const rom = Math.round(clamp(this.maxProgress / idealProgress) * 100);
      const quality: "perfect" | "good" =
        rom >= 90 && form >= 85 ? "perfect" : "good";

      this.reps += 1;
      this.romScores.push(rom);
      this.formScores.push(form);
      this.lastRepTs = now;
      events.push({ type: "rep", reps: this.reps, rom, form, quality });

      if (tooFast && this.throttleCue(now, 1200)) {
        events.push({ type: "cue", message: "Slow down — control it", tone: "correct" });
      }
    }

    return events;
  }

  private updateHold(map: KeypointMap, dt: number, now: number): CoachEvent[] {
    const events: CoachEvent[] = [];
    const cfg = this.cfg as Extract<ExerciseConfig, { type: "hold" }>;
    const side = bestSide(
      map,
      ["left_shoulder", "left_hip", "left_knee"],
      ["right_shoulder", "right_hip", "right_knee"]
    );
    this.tracking = side !== null;
    if (!side) return events;

    const m = postureMetric(map, side, cfg.posture);
    this.formOk = m.ok;
    this.progress = clamp(m.value / 180);
    if (m.ok) {
      this.holdSeconds += dt;
      this.formScores.push(100);
      if (this.holdSeconds - this.holdPraiseAt >= 15) {
        this.holdPraiseAt = this.holdSeconds;
        events.push({ type: "cue", message: "Solid hold — stay tight", tone: "praise" });
      }
    } else {
      this.formScores.push(40);
      if (this.throttleCue(now)) {
        events.push({ type: "cue", message: cfg.posture.cue, tone: "correct" });
      }
    }
    return events;
  }

  private updateGeneric(map: KeypointMap, now: number): CoachEvent[] {
    const events: CoachEvent[] = [];
    const lh = map["left_hip"];
    const rh = map["right_hip"];
    const ls = map["left_shoulder"];
    this.tracking = !!(lh && rh && ls);
    if (!lh || !rh || !ls) return events;
    const hipY = (lh.y + rh.y) / 2;
    const torso = Math.abs((ls.y ?? hipY) - hipY) || 1;
    if (this.gBaseline === 0) this.gBaseline = hipY;
    this.gBaseline = this.gBaseline * 0.95 + hipY * 0.05;
    const drop = (hipY - this.gBaseline) / torso;
    this.progress = clamp(drop / 0.4);
    if (this.gPhase === "up" && drop > 0.35) this.gPhase = "down";
    else if (this.gPhase === "down" && drop < 0.12) {
      this.gPhase = "up";
      this.reps += 1;
      this.lastRepTs = now;
      events.push({ type: "rep", reps: this.reps, rom: 100, form: 100, quality: "good" });
    }
    return events;
  }

  state(): CoachState {
    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : null;
    return {
      reps: this.reps,
      holdSeconds: Math.floor(this.holdSeconds),
      progress: this.progress,
      avgRom: avg(this.romScores),
      avgForm: avg(this.formScores),
      formOk: this.formOk,
      tracking: this.tracking,
      inMotion: this.inAttempt,
    };
  }

  summary() {
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
    return {
      reps: this.reps,
      holdSeconds: Math.floor(this.holdSeconds),
      romScore: Math.round(avg(this.romScores)),
      formScore: Math.round(avg(this.formScores)),
    };
  }
}
