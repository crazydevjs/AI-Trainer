import {
  angle,
  bestSide,
  toMap,
  type Keypoint,
  type KeypointMap,
} from "./angles";
import type { ExerciseConfig, RepConfig, PostureRule } from "./exercises";
import type { FormCheck, Severity } from "./form-rules";

export interface Fault {
  message: string;
  severity: Severity;
}

/** A completed attempt (valid rep or rejected attempt) for per-set analysis. */
export interface AttemptRecord {
  valid: boolean;
  repNumber: number; // valid-rep number (0 if rejected)
  form: number;
  rom: number;
  stability: number;
  faults: string[]; // fault messages seen this attempt
}

export type CoachEvent =
  | {
      type: "rep";
      reps: number;
      rom: number;
      form: number;
      stability: number;
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
  formOk: boolean;
  tracking: boolean;
  inMotion: boolean;
  fault: Fault | null;
  /** keypoints to highlight as problematic */
  faultJoints: string[];
  /** an error-severity fault is currently active → Safety Mode */
  danger: boolean;
  color: FormColor;
}

export interface SessionSummary {
  reps: number;
  invalidReps: number;
  holdSeconds: number;
  romScore: number;
  formScore: number;
  stabilityScore: number;
  topMistakes: string[];
}

// --- tuning ---
const ENTER = 0.35;
const EXIT = 0.15;
const DEPTH_FRAMES = 2;
const REVERSAL = 0.18;
const MIN_CONF = 0.3;
const SMOOTH = 0.5;
const FAULT_FRAMES = 4;
const CHECK_FROM = 0.35;

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

function holdPosture(map: KeypointMap, side: string, rule: PostureRule) {
  const sh = map[`${side}_shoulder`];
  const hip = map[`${side}_hip`];
  const knee = map[`${side}_knee`];
  if (!sh || !hip || !knee) return true;
  return angle(sh, hip, knee) >= rule.threshold;
}

interface ActiveFault extends Fault {
  id: string;
  joints: string[];
}

export class RepCounter {
  private cfg: ExerciseConfig;
  private checks: FormCheck[];
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
  private lastRepTs = 0;
  private lastTs = 0;
  private lastCueTs = 0;

  // per-rep form state
  private faultFrames: Record<string, number> = {};
  private repFaults: Record<string, Severity> = {};
  private warnedFault = new Set<string>();
  private attemptFaults: string[] = []; // fault messages this attempt
  private currentFault: Fault | null = null;
  private currentJoints: string[] = [];
  private attempts: AttemptRecord[] = [];

  // per-rep stability sampling
  private swayMin = Infinity;
  private swayMax = -Infinity;
  private torsoSum = 0;
  private torsoN = 0;

  // session stats
  private romScores: number[] = [];
  private formScores: number[] = [];
  private stabilityScores: number[] = [];
  private faultCounts: Record<string, number> = {};

  private gPhase: "up" | "down" = "up";
  private gBaseline = 0;
  private holdPraiseAt = 0;

  constructor(cfg: ExerciseConfig, checks: FormCheck[] = []) {
    this.cfg = cfg;
    this.checks = checks;
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
    this.faultFrames = {};
    this.repFaults = {};
    this.warnedFault.clear();
    this.attemptFaults = [];
    this.currentFault = null;
    this.currentJoints = [];
    this.swayMin = Infinity;
    this.swayMax = -Infinity;
    this.torsoSum = 0;
    this.torsoN = 0;
  }

  /** Full attempt log (valid + rejected) for per-set analysis. */
  getAttempts(): AttemptRecord[] {
    return this.attempts;
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
    this.smoothAngle = isNaN(this.smoothAngle)
      ? raw
      : this.smoothAngle * (1 - SMOOTH) + raw * SMOOTH;
    const ang = this.smoothAngle;
    const progress = (ang - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);
    this.progress = clamp(progress);

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
      const active = this.evalChecks(map, side);
      const worst = pickWorst(active);
      this.currentFault = worst;
      this.currentJoints = active.flatMap((f) => f.joints);
      const fresh = active.find((f) => !this.warnedFault.has(f.id));
      if (fresh) {
        this.warnedFault.add(fresh.id);
        this.repFaults[fresh.id] = fresh.severity;
        this.faultCounts[fresh.message] = (this.faultCounts[fresh.message] ?? 0) + 1;
        if (!this.attemptFaults.includes(fresh.message)) {
          this.attemptFaults.push(fresh.message);
        }
        if (this.throttleCue(now)) {
          events.push({ type: "cue", message: fresh.message, tone: "correct" });
        }
      }
    } else {
      this.currentFault = null;
      this.currentJoints = [];
    }

    if (progress >= 1) {
      this.framesAtDepth += 1;
      if (this.framesAtDepth >= DEPTH_FRAMES) this.reachedDepth = true;
    } else {
      this.framesAtDepth = 0;
    }

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

    // attempt ends at the top
    if (progress < EXIT) {
      this.inAttempt = false;
      this.progress = 0;
      this.currentFault = null;
      this.currentJoints = [];
      const tooFast = this.lastRepTs > 0 && now - this.lastRepTs < 700;

      const errorCount = Object.values(this.repFaults).filter((s) => s === "error").length;
      const warnCount = Object.values(this.repFaults).filter((s) => s === "warn").length;
      const form = Math.max(0, 100 - errorCount * 30 - warnCount * 12);
      const stability = this.computeStability();
      const idealProgress =
        (cfg.idealAngle - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);
      const rom = Math.round(clamp(this.maxProgress / idealProgress) * 100);

      // REJECT: depth
      if (!this.reachedDepth) {
        this.invalidReps += 1;
        this.faultCounts[cfg.incompleteCue] = (this.faultCounts[cfg.incompleteCue] ?? 0) + 1;
        if (!this.attemptFaults.includes(cfg.incompleteCue)) this.attemptFaults.push(cfg.incompleteCue);
        this.attempts.push({ valid: false, repNumber: 0, form, rom, stability, faults: this.attemptFaults });
        this.resetRep();
        events.push({ type: "badrep", reason: cfg.incompleteCue });
        return events;
      }
      // REJECT: unsafe form
      if (errorCount > 0) {
        const reason = this.firstErrorCue();
        this.invalidReps += 1;
        this.attempts.push({ valid: false, repNumber: 0, form, rom, stability, faults: this.attemptFaults });
        this.resetRep();
        events.push({ type: "badrep", reason });
        return events;
      }

      // VALID REP
      const quality: "perfect" | "good" =
        rom >= 90 && form >= 85 && stability >= 80 ? "perfect" : "good";

      this.reps += 1;
      this.romScores.push(rom);
      this.formScores.push(form);
      this.stabilityScores.push(stability);
      this.attempts.push({ valid: true, repNumber: this.reps, form, rom, stability, faults: this.attemptFaults });
      this.lastRepTs = now;
      this.resetRep();
      events.push({ type: "rep", reps: this.reps, rom, form, stability, quality });

      if (tooFast && this.throttleCue(now, 1200)) {
        events.push({ type: "cue", message: "Slow down — control it", tone: "correct" });
      }
    }

    return events;
  }

  private computeStability(): number {
    if (this.torsoN === 0 || this.swayMax < this.swayMin) return 100;
    const torso = this.torsoSum / this.torsoN || 1;
    const sway = this.swayMax - this.swayMin;
    return Math.round(Math.max(0, Math.min(100, 100 - (sway / torso) * 120)));
  }

  private evalChecks(map: KeypointMap, side: "left" | "right"): ActiveFault[] {
    const active: ActiveFault[] = [];
    for (const c of this.checks) {
      const good = c.test(map, side);
      this.faultFrames[c.id] = good ? 0 : (this.faultFrames[c.id] ?? 0) + 1;
      if ((this.faultFrames[c.id] ?? 0) >= FAULT_FRAMES) {
        active.push({ id: c.id, message: c.cue, severity: c.severity, joints: c.joints(side) });
      }
    }
    return active;
  }

  private firstErrorCue(): string {
    for (const c of this.checks) if (this.repFaults[c.id] === "error") return c.cue;
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
      this.formScores.push(40);
      this.faultCounts[cfg.posture.cue] = (this.faultCounts[cfg.posture.cue] ?? 0) + 1;
      if (this.throttleCue(now)) {
        events.push({ type: "cue", message: cfg.posture.cue, tone: "correct" });
      }
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
      events.push({ type: "rep", reps: this.reps, rom: 100, form: 100, stability: 100, quality: "good" });
    }
    return events;
  }

  state(): CoachState {
    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : null;
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
      avgRom: avg(this.romScores),
      avgForm: avg(this.formScores),
      formOk: this.currentFault === null,
      tracking: this.tracking,
      inMotion: this.inAttempt,
      fault: this.currentFault,
      faultJoints: this.currentJoints,
      danger,
      color,
    };
  }

  summary(): SessionSummary {
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
    const topMistakes = Object.entries(this.faultCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([msg]) => msg);
    return {
      reps: this.reps,
      invalidReps: this.invalidReps,
      holdSeconds: Math.floor(this.holdSeconds),
      romScore: Math.round(avg(this.romScores)),
      formScore: Math.round(avg(this.formScores)),
      stabilityScore: Math.round(avg(this.stabilityScores)) || 100,
      topMistakes,
    };
  }
}

function pickWorst(faults: ActiveFault[]): Fault | null {
  if (!faults.length) return null;
  const err = faults.find((f) => f.severity === "error");
  return err ?? faults[0];
}
