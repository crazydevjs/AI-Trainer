import {
  angle,
  bestSide,
  toMap,
  type Keypoint,
  type KeypointMap,
} from "./angles";
import type { ExerciseConfig, RepConfig, PostureRule } from "./exercises";
import {
  detectOrientation,
  viewMatches,
  type FormCheck,
  type Mode,
  type Orientation,
  type Severity,
  type View,
} from "./form-rules";

export interface Fault {
  message: string;
  severity: Severity;
}

export interface AttemptRecord {
  valid: boolean;
  repNumber: number;
  form: number;
  rom: number;
  stability: number;
  faults: string[];
}

export type CoachEvent =
  | {
      type: "rep";
      reps: number;
      rom: number;
      form: number;
      stability: number;
      confidence: number;
      quality: "perfect" | "good";
    }
  | { type: "badrep"; reason: string }
  | { type: "cue"; message: string; tone: "correct" | "praise" };

export type FormColor = "green" | "amber" | "red" | "idle";

export interface CoachState {
  reps: number;
  invalidReps: number;
  holdSeconds: number;
  progress: number;
  avgRom: number | null;
  avgForm: number | null;
  confidence: number; // running rep confidence 0..100
  formOk: boolean;
  tracking: boolean;
  inMotion: boolean;
  fault: Fault | null;
  faultJoints: string[];
  danger: boolean;
  color: FormColor;
  orientation: Orientation;
}

export interface SessionSummary {
  reps: number;
  invalidReps: number;
  holdSeconds: number;
  romScore: number;
  formScore: number;
  stabilityScore: number;
  confidenceScore: number;
  topMistakes: string[];
}

// --- tuning ---
const ENTER = 0.35;
const EXIT = 0.15;
const DEPTH_FRAMES = 2;
const REVERSAL = 0.18;
const MIN_CONF = 0.3;
const SMOOTH = 0.5;
const SUSTAIN = 7; // frames a status must persist to be "active" (~0.25s)
const HIGH_CONF = 0.5; // min keypoint confidence to let an error reject a rep
const CHECK_FROM = 0.35;

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const avg = (a: number[]) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0);

function holdPosture(map: KeypointMap, side: string, rule: PostureRule) {
  const sh = map[`${side}_shoulder`];
  const hip = map[`${side}_hip`];
  const knee = map[`${side}_knee`];
  if (!sh || !hip || !knee) return true;
  return angle(sh, hip, knee) >= rule.threshold;
}

export class RepCounter {
  private cfg: ExerciseConfig;
  private checks: FormCheck[];
  private mode: Mode;
  private requiredView: View;

  reps = 0;
  invalidReps = 0;
  holdSeconds = 0;

  private inAttempt = false;
  private maxProgress = 0;
  private framesAtDepth = 0;
  private reachedDepth = false;
  private warnedDepth = false;
  private smoothAngle = NaN;
  private progress = 0;
  private tracking = false;
  private orientation: Orientation = "unknown";
  private lastRepTs = 0;
  private lastTs = 0;
  private lastCueTs = 0;
  private lastCamCueTs = 0;
  private mismatchFrames = 0;

  // per-check run-length state (multi-frame)
  private runStatus: Record<string, "ok" | "warn" | "error"> = {};
  private runLen: Record<string, number> = {};
  private activeId: string | null = null; // worst currently-active fault
  private repErrors = new Set<string>(); // sustained high-confidence errors
  private repWarns = new Set<string>();
  private attemptFaults: string[] = [];
  private confSamples: number[] = [];
  private currentFault: Fault | null = null;
  private currentJoints: string[] = [];
  private runConfidence = 0;

  // stability sampling
  private swayMin = Infinity;
  private swayMax = -Infinity;
  private torsoSum = 0;
  private torsoN = 0;

  // session stats
  private romScores: number[] = [];
  private formScores: number[] = [];
  private stabilityScores: number[] = [];
  private confScores: number[] = [];
  private faultCounts: Record<string, number> = {};
  private attempts: AttemptRecord[] = [];

  private gPhase: "up" | "down" = "up";
  private gBaseline = 0;
  private holdPraiseAt = 0;

  constructor(
    cfg: ExerciseConfig,
    checks: FormCheck[] = [],
    opts: { mode?: Mode; requiredView?: View } = {}
  ) {
    this.cfg = cfg;
    this.checks = checks;
    this.mode = opts.mode ?? "beginner";
    this.requiredView = opts.requiredView ?? "any";
  }

  getAttempts() {
    return this.attempts;
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

  private resetRep() {
    this.runStatus = {};
    this.runLen = {};
    this.activeId = null;
    this.repErrors.clear();
    this.repWarns.clear();
    this.attemptFaults = [];
    this.confSamples = [];
    this.currentFault = null;
    this.currentJoints = [];
    this.swayMin = Infinity;
    this.swayMax = -Infinity;
    this.torsoSum = 0;
    this.torsoN = 0;
  }

  private sampleStability(map: KeypointMap) {
    const lh = map.left_hip;
    const rh = map.right_hip;
    const ls = map.left_shoulder;
    if (!lh || !rh) return;
    const cx = (lh.x + rh.x) / 2;
    this.swayMin = Math.min(this.swayMin, cx);
    this.swayMax = Math.max(this.swayMax, cx);
    if (ls) {
      this.torsoSum += Math.abs(ls.y - lh.y);
      this.torsoN += 1;
    }
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
      return events;
    }

    const raw = angle(pts[0], pts[1], pts[2]);
    this.smoothAngle = isNaN(this.smoothAngle) ? raw : this.smoothAngle * (1 - SMOOTH) + raw * SMOOTH;
    const ang = this.smoothAngle;
    const progress = (ang - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);
    this.progress = clamp(progress);
    this.orientation = detectOrientation(map);

    // mode-adjusted required depth
    const dir = cfg.startAngle > cfg.activeAngle ? 1 : -1;
    const ease = this.mode === "beginner" ? 12 : this.mode === "advanced" ? -6 : 0;
    const requiredActive = cfg.activeAngle + dir * ease;
    const reqProgress = (requiredActive - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);

    if (!this.inAttempt) {
      this.currentFault = null;
      this.currentJoints = [];
      if (progress > ENTER) {
        this.inAttempt = true;
        this.maxProgress = progress;
        this.framesAtDepth = 0;
        this.reachedDepth = false;
        this.warnedDepth = false;
        this.resetRep();
      }
      return events;
    }

    // --- in an attempt ---
    this.maxProgress = Math.max(this.maxProgress, progress);
    this.sampleStability(map);

    if (progress > CHECK_FROM) {
      // rep confidence from the main joints
      const frameConf = Math.min(...pts.map((p) => p.score ?? 0));
      this.confSamples.push(frameConf);

      // camera-angle awareness for the exercise's required view
      if (
        this.requiredView !== "any" &&
        this.orientation !== "unknown" &&
        !viewMatches(this.requiredView, this.orientation)
      ) {
        this.mismatchFrames++;
        if (this.mismatchFrames > 18 && now - this.lastCamCueTs > 6000) {
          this.lastCamCueTs = now;
          events.push({
            type: "cue",
            message: `Turn ${this.requiredView}-on for accurate tracking`,
            tone: "correct",
          });
        }
      } else {
        this.mismatchFrames = Math.max(0, this.mismatchFrames - 1);
      }

      this.evalForm(map, side, now, events);
    } else {
      this.currentFault = null;
      this.currentJoints = [];
    }

    // depth (mode-adjusted) with multi-frame confirm
    if (progress >= reqProgress) {
      this.framesAtDepth += 1;
      if (this.framesAtDepth >= DEPTH_FRAMES) this.reachedDepth = true;
    } else {
      this.framesAtDepth = 0;
    }

    if (
      !this.reachedDepth &&
      !this.warnedDepth &&
      progress < this.maxProgress - REVERSAL &&
      this.maxProgress < reqProgress
    ) {
      this.warnedDepth = true;
      if (this.throttleCue(now, 1200)) {
        events.push({ type: "cue", message: cfg.incompleteCue, tone: "correct" });
      }
    }

    // attempt ends at the top
    if (progress < EXIT) {
      this.inAttempt = false;
      this.progress = 0;
      this.currentFault = null;
      this.currentJoints = [];
      const tooFast = this.lastRepTs > 0 && now - this.lastRepTs < 700;

      const repConfidence = avg(this.confSamples);
      const errors = this.repErrors.size;
      const warns = this.repWarns.size;
      const form = Math.max(0, 100 - errors * 30 - warns * 12);
      const stability = this.computeStability();
      const idealProgress = (cfg.idealAngle - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);
      const rom = Math.round(clamp(this.maxProgress / idealProgress) * 100);
      const confPct = Math.round(repConfidence * 100);

      // REJECT: insufficient depth (both modes)
      if (!this.reachedDepth) {
        this.invalidReps += 1;
        this.faultCounts[cfg.incompleteCue] = (this.faultCounts[cfg.incompleteCue] ?? 0) + 1;
        if (!this.attemptFaults.includes(cfg.incompleteCue)) this.attemptFaults.push(cfg.incompleteCue);
        this.attempts.push({ valid: false, repNumber: 0, form, rom, stability, faults: this.attemptFaults });
        this.resetRep();
        events.push({ type: "badrep", reason: cfg.incompleteCue });
        return events;
      }
      // REJECT: unsafe form — only in Advanced, only sustained high-confidence errors
      if (this.mode === "advanced" && errors > 0 && repConfidence >= HIGH_CONF) {
        const reason = this.firstErrorCue();
        this.invalidReps += 1;
        this.attempts.push({ valid: false, repNumber: 0, form, rom, stability, faults: this.attemptFaults });
        this.resetRep();
        events.push({ type: "badrep", reason });
        return events;
      }

      // VALID REP (minor/borderline issues counted, with coaching already given)
      const quality: "perfect" | "good" =
        rom >= 90 && form >= 85 && stability >= 80 ? "perfect" : "good";
      this.reps += 1;
      this.romScores.push(rom);
      this.formScores.push(form);
      this.stabilityScores.push(stability);
      this.confScores.push(confPct);
      this.attempts.push({ valid: true, repNumber: this.reps, form, rom, stability, faults: this.attemptFaults });
      this.lastRepTs = now;
      this.resetRep();
      events.push({ type: "rep", reps: this.reps, rom, form, stability, confidence: confPct, quality });

      if (tooFast && this.throttleCue(now, 1200)) {
        events.push({ type: "cue", message: "Slow down — control it", tone: "correct" });
      }
    }

    return events;
  }

  /** Evaluate all applicable checks; promote a status only after it persists. */
  private evalForm(map: KeypointMap, side: "left" | "right", now: number, events: CoachEvent[]) {
    let worst: { fault: Fault; joints: string[]; rank: number } | null = null;
    for (const c of this.checks) {
      if (!viewMatches(c.view, this.orientation)) continue;
      const res = c.evaluate(map, side, this.mode);
      if (!res) continue;

      // demote a low-confidence error to a warning
      const status = res.status === "error" && res.confidence < HIGH_CONF ? "warn" : res.status;

      if (this.runStatus[c.id] === status) this.runLen[c.id] = (this.runLen[c.id] ?? 0) + 1;
      else {
        this.runStatus[c.id] = status;
        this.runLen[c.id] = 1;
      }

      const active = (this.runLen[c.id] ?? 0) >= SUSTAIN && status !== "ok";
      if (!active) continue;

      // record the fault for this rep
      if (status === "error" && res.confidence >= HIGH_CONF) this.repErrors.add(c.id);
      else this.repWarns.add(c.id);

      if (!this.attemptFaults.includes(c.cue)) {
        this.attemptFaults.push(c.cue);
        this.faultCounts[c.cue] = (this.faultCounts[c.cue] ?? 0) + 1;
        if (this.throttleCue(now)) events.push({ type: "cue", message: c.cue, tone: "correct" });
      }

      const rank = status === "error" ? 2 : 1;
      if (!worst || rank > worst.rank) {
        worst = { fault: { message: c.cue, severity: status as Severity }, joints: c.joints(side), rank };
      }
    }
    this.currentFault = worst?.fault ?? null;
    this.currentJoints = worst?.joints ?? [];
    this.runConfidence = this.confSamples.length ? this.confSamples[this.confSamples.length - 1] : 0;
  }

  private computeStability(): number {
    if (this.torsoN === 0 || this.swayMax < this.swayMin) return 100;
    const torso = this.torsoSum / this.torsoN || 1;
    return Math.round(clamp(1 - ((this.swayMax - this.swayMin) / torso) * 1.2) * 100);
  }

  private firstErrorCue(): string {
    for (const c of this.checks) if (this.repErrors.has(c.id)) return c.cue;
    return "Fix your form";
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
    const good = holdPosture(map, side, cfg.posture);
    this.currentFault = good ? null : { message: cfg.posture.cue, severity: "warn" };
    this.currentJoints = good ? [] : [`${side}_hip`];
    if (good) {
      this.holdSeconds += dt;
      this.formScores.push(100);
      if (this.holdSeconds - this.holdPraiseAt >= 15) {
        this.holdPraiseAt = this.holdSeconds;
        events.push({ type: "cue", message: "Great hold. Stay strong.", tone: "praise" });
      }
    } else {
      this.formScores.push(60);
      this.faultCounts[cfg.posture.cue] = (this.faultCounts[cfg.posture.cue] ?? 0) + 1;
      if (this.throttleCue(now)) events.push({ type: "cue", message: cfg.posture.cue, tone: "correct" });
    }
    return events;
  }

  private updateGeneric(map: KeypointMap, now: number): CoachEvent[] {
    const events: CoachEvent[] = [];
    const lh = map.left_hip;
    const rh = map.right_hip;
    const ls = map.left_shoulder;
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
      events.push({ type: "rep", reps: this.reps, rom: 100, form: 100, stability: 100, confidence: 90, quality: "good" });
    }
    return events;
  }

  state(): CoachState {
    const a = (arr: number[]) => (arr.length ? Math.round(avg(arr)) : null);
    const danger = this.currentFault?.severity === "error";
    const color: FormColor = !this.inAttempt
      ? "idle"
      : this.currentFault
        ? this.currentFault.severity === "error"
          ? "red"
          : "amber"
        : "green";
    return {
      reps: this.reps,
      invalidReps: this.invalidReps,
      holdSeconds: Math.floor(this.holdSeconds),
      progress: this.progress,
      avgRom: a(this.romScores),
      avgForm: a(this.formScores),
      confidence: Math.round(this.runConfidence * 100),
      formOk: this.currentFault === null,
      tracking: this.tracking,
      inMotion: this.inAttempt,
      fault: this.currentFault,
      faultJoints: this.currentJoints,
      danger,
      color,
      orientation: this.orientation,
    };
  }

  summary(): SessionSummary {
    const topMistakes = Object.entries(this.faultCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m]) => m);
    return {
      reps: this.reps,
      invalidReps: this.invalidReps,
      holdSeconds: Math.floor(this.holdSeconds),
      romScore: Math.round(avg(this.romScores)),
      formScore: Math.round(avg(this.formScores)),
      stabilityScore: Math.round(avg(this.stabilityScores)) || 100,
      confidenceScore: Math.round(avg(this.confScores)) || 0,
      topMistakes,
    };
  }
}
