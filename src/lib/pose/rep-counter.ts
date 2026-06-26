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

export type CoachEvent =
  | { type: "rep"; reps: number; rom: number; form: number; quality: "perfect" | "good" }
  | { type: "badrep"; reason: string }
  | { type: "cue"; message: string; tone: "correct" | "praise" };

export interface CoachState {
  reps: number;
  holdSeconds: number;
  progress: number;
  avgRom: number | null;
  avgForm: number | null;
  formOk: boolean;
  tracking: boolean;
  inMotion: boolean;
  /** current live form fault for the on-screen indicator */
  fault: Fault | null;
}

// --- tuning ---
const ENTER = 0.35;
const EXIT = 0.15;
const DEPTH_FRAMES = 2;
const REVERSAL = 0.18;
const MIN_CONF = 0.3;
const SMOOTH = 0.5;
const FAULT_FRAMES = 4; // a fault must persist this many frames (anti-jitter)
const CHECK_FROM = 0.35; // only judge form once into the movement

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

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
  reps = 0;
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

  // form-fault tracking (per rep)
  private faultFrames: Record<string, number> = {};
  private repFaults: Record<string, Severity> = {};
  private warnedFault = new Set<string>();
  private currentFault: Fault | null = null;

  private romScores: number[] = [];
  private formScores: number[] = [];

  private gPhase: "up" | "down" = "up";
  private gBaseline = 0;
  private holdPraiseAt = 0;
  private holdFormOk = true;

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
    this.currentFault = null;
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

    // evaluate form faults once into the movement
    if (progress > CHECK_FROM) {
      const active = this.evalChecks(map, side);
      this.currentFault = pickWorst(active);
      // announce a newly-seen fault (errors first), once per rep per fault
      const fresh = active.find(
        (f) => !this.warnedFault.has(f.id)
      );
      if (fresh) {
        this.warnedFault.add(fresh.id);
        this.repFaults[fresh.id] = fresh.severity;
        if (this.throttleCue(now)) {
          events.push({ type: "cue", message: fresh.message, tone: "correct" });
        }
      }
    } else {
      this.currentFault = null;
    }

    if (progress >= 1) {
      this.framesAtDepth += 1;
      if (this.framesAtDepth >= DEPTH_FRAMES) this.reachedDepth = true;
    } else {
      this.framesAtDepth = 0;
    }

    // coming up before reaching depth → coach immediately
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
      const tooFast = this.lastRepTs > 0 && now - this.lastRepTs < 700;

      const errors = Object.values(this.repFaults).filter((s) => s === "error").length;
      const warns = Object.values(this.repFaults).filter((s) => s === "warn").length;
      const form = Math.max(0, 100 - errors * 30 - warns * 12);

      // REJECT: insufficient depth
      if (!this.reachedDepth) {
        this.resetRep();
        events.push({ type: "badrep", reason: cfg.incompleteCue });
        return events;
      }
      // REJECT: unsafe form (an error-severity fault persisted)
      if (errors > 0) {
        const reason = this.firstErrorCue();
        this.resetRep();
        events.push({ type: "badrep", reason });
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
      this.resetRep();
      events.push({ type: "rep", reps: this.reps, rom, form, quality });

      if (tooFast && this.throttleCue(now, 1200)) {
        events.push({ type: "cue", message: "Slow down — control it", tone: "correct" });
      }
    }

    return events;
  }

  private evalChecks(map: KeypointMap, side: "left" | "right"): (Fault & { id: string })[] {
    const active: (Fault & { id: string })[] = [];
    for (const c of this.checks) {
      const good = c.test(map, side);
      this.faultFrames[c.id] = good ? 0 : (this.faultFrames[c.id] ?? 0) + 1;
      if ((this.faultFrames[c.id] ?? 0) >= FAULT_FRAMES) {
        active.push({ id: c.id, message: c.cue, severity: c.severity });
      }
    }
    return active;
  }

  private firstErrorCue(): string {
    for (const c of this.checks) {
      if (this.repFaults[c.id] === "error") return c.cue;
    }
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
    this.holdFormOk = good;
    this.currentFault = good ? null : { message: cfg.posture.cue, severity: "warn" };
    if (good) {
      this.holdSeconds += dt;
      this.formScores.push(100);
      if (this.holdSeconds - this.holdPraiseAt >= 15) {
        this.holdPraiseAt = this.holdSeconds;
        events.push({ type: "cue", message: "Great hold. Stay strong.", tone: "praise" });
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
      formOk: this.currentFault === null,
      tracking: this.tracking,
      inMotion: this.inAttempt,
      fault: this.currentFault,
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

function pickWorst(faults: (Fault & { id: string })[]): Fault | null {
  if (!faults.length) return null;
  const err = faults.find((f) => f.severity === "error");
  return err ?? faults[0];
}
