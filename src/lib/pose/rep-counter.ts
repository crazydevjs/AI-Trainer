import {
  angle,
  angle3D,
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
import {
  buildValidation,
  deriveRepState,
  type RejectionCode,
  type RepState,
  type ValidationResult,
} from "./state-machine";

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
      /** tuning telemetry: what the state machine saw for this rep */
      peak: number;
      required: number;
      angleSource: "3D" | "2D";
      state: RepState;
      prevState: RepState;
      validation: ValidationResult;
    }
  | {
      type: "badrep";
      reason: string;
      peak: number;
      required: number;
      rom: number;
      confidence: number;
      angleSource: "3D" | "2D";
      state: RepState;
      prevState: RepState;
      reasonCode: RejectionCode;
      validation: ValidationResult;
    }
  | { type: "cue"; message: string; tone: "correct" | "praise" };

/** Why the last rep attempt was accepted or rejected (dev HUD + debug log). */
export interface RepDecision {
  accepted: boolean;
  reason: string; // "perfect"/"good" or the rejection cue
  rom: number;
  peak: number; // deepest progress reached (0..1)
  required: number; // progress needed to count (0..1)
  confidence: number; // 0..100
  at: number; // performance.now() ms
}

/** Live internals of the rep engine, surfaced for data-driven tuning. */
export interface RepDebugInfo {
  side: "left" | "right" | null;
  joints: string; // e.g. "shoulder→elbow→wrist"
  angle: number | null; // smoothed joint angle (deg)
  angleSource: "3D" | "2D";
  progress: number;
  peak: number;
  requiredProgress: number;
  turnaroundTol: number;
  wristVeto: boolean; // overhead-press wrist gate currently zeroing progress
  lastDecision: RepDecision | null;
  /** named state machine — see state-machine.ts / ALGORITHM.md */
  state: RepState;
  prevState: RepState;
  transitionReason: string;
  /** 0..100 — how many consecutive frames have agreed on the current state */
  stateConfidence: number;
  /** 0..100 — current frame's joint confidence (distinct from the rep-level
   *  average `CoachState.confidence`) */
  poseConfidence: number;
  lastValidation: ValidationResult | null;
}

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
  /** debug: where in the movement cycle we are */
  repPhase: "idle" | "down" | "up";
  /** live engine internals for the dev HUD / tuning exports */
  debug: RepDebugInfo;
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
// Real-time rep detection via bottom-turnaround (extremum) tracking:
// a rep is counted the instant the user reverses out of the bottom after
// reaching valid depth — no need to return to lockout or pause.
const ENTER = 0.25; // progress to begin a rep (descending past this)
const TURN = 0.1; // default progress reversal that confirms a direction change
const MIN_REP_PEAK = 0.5; // ignore fidget movements shallower than this
const MIN_CONF = 0.3;
const SMOOTH = 0.35; // lighter smoothing → more responsive
const SUSTAIN = 6; // frames a form status must persist to be "active"
const HIGH_CONF = 0.5; // min keypoint confidence to let an error reject a rep
const CHECK_FROM = 0.35;
// Minimum gap between reps before the tempo check flags "too fast". Always
// computed; only rejects a rep when strict validation is enabled (see
// buildValidation / RepCounter.strict) — unchanged from the prior inline 450.
const MIN_REP_INTERVAL_MS = 450;
// Stability floor (0..100) for the strict-mode "excessive swing" check.
// Advisory-only unless strict validation is enabled.
const MIN_STABILITY = 40;

/** All engine tuning constants — stamped into debug exports so tuning
 *  decisions can be tied to the exact values a session ran with. */
export const REP_TUNING = {
  ENTER,
  TURN,
  MIN_REP_PEAK,
  MIN_CONF,
  SMOOTH,
  SUSTAIN,
  HIGH_CONF,
  CHECK_FROM,
  MIN_REP_INTERVAL_MS,
  MIN_STABILITY,
} as const;

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
  /** off by default — see getStrictValidation() in lib/dev.ts */
  private strict: boolean;

  reps = 0;
  invalidReps = 0;
  holdSeconds = 0;

  // bottom-turnaround state machine
  private phase: "up" | "down" = "up";
  private peak = 0; // deepest progress in the current rep cycle
  private valley = 0; // shallowest progress while ascending
  private smoothAngle = NaN;
  private progress = 0;
  private prevProgress = 0;
  private tracking = false;
  /** whether the last rep-angle measurement used 3D world landmarks */
  angleFrom3D = false;

  // named state machine (state-machine.ts) — a display/telemetry layer over
  // the phase/peak/progress signals above; does not itself gate accept/reject
  private repState: RepState = "WAITING";
  private prevRepState: RepState = "WAITING";
  private transitionReason = "landmarks not yet tracked";
  private stateRunLen = 0;
  private lastPoseConfidence = 0;
  private lastValidation: ValidationResult | null = null;

  // live debug state (dev HUD + tuning exports)
  private dbgSide: "left" | "right" | null = null;
  private dbgReqProgress = 0;
  private dbgTurn = TURN;
  private dbgWristVeto = false;
  private lastDecision: RepDecision | null = null;
  private orientation: Orientation = "unknown";
  private lastRepTs = 0;
  private lastTs = 0;
  private lastCueTs = 0;
  private lastCamCueTs = 0;
  private mismatchFrames = 0;

  // per-check run-length state (multi-frame)
  private runStatus: Record<string, "ok" | "warn" | "error"> = {};
  private runLen: Record<string, number> = {};
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

  private phaseProgressPrev = 0;
  private gPhase: "up" | "down" = "up";
  private gBaseline = 0;
  private holdPraiseAt = 0;

  constructor(
    cfg: ExerciseConfig,
    checks: FormCheck[] = [],
    opts: { mode?: Mode; requiredView?: View; strict?: boolean } = {}
  ) {
    this.cfg = cfg;
    this.checks = checks;
    this.mode = opts.mode ?? "beginner";
    this.requiredView = opts.requiredView ?? "any";
    this.strict = opts.strict ?? false;
  }

  getAttempts() {
    return this.attempts;
  }

  /** Update the named state machine; only writes on an actual state change
   *  so `stateConfidence` reflects consecutive-frame agreement. */
  private updateRepState(prevProgress: number) {
    const { state, reason } = deriveRepState(this.repState, {
      tracking: this.tracking,
      phase: this.phase,
      progress: this.progress,
      prevProgress,
      peak: this.peak,
    });
    if (state !== this.repState) {
      this.prevRepState = this.repState;
      this.repState = state;
      this.transitionReason = reason;
      this.stateRunLen = 1;
    } else {
      this.stateRunLen = Math.min(SUSTAIN, this.stateRunLen + 1);
    }
  }

  /** Directly assign a decision-frame state (LOCKOUT / REP_COMPLETE / back to
   *  READY on rejection) — these happen at the exact frame rep-counter.ts's
   *  existing accept/reject logic already runs, so this never disagrees
   *  with the real decision. */
  private setRepState(state: RepState, reason: string) {
    this.prevRepState = this.repState;
    this.repState = state;
    this.transitionReason = reason;
    this.stateRunLen = 1;
  }

  private throttleCue(now: number, gap = 1500): boolean {
    if (now - this.lastCueTs < gap) return false;
    this.lastCueTs = now;
    return true;
  }

  update(rawKeypoints: Keypoint[], now: number, raw3D?: Keypoint[] | null): CoachEvent[] {
    const dt = this.lastTs ? (now - this.lastTs) / 1000 : 0;
    this.lastTs = now;
    const map = toMap(rawKeypoints);
    const map3D = raw3D && raw3D.length ? toMap(raw3D) : null;
    if (this.cfg.type === "generic") return this.updateGeneric(map, now);
    if (this.cfg.type === "hold") return this.updateHold(map, dt, now);
    return this.updateRep(this.cfg, map, now, map3D);
  }

  private resetRep() {
    this.runStatus = {};
    this.runLen = {};
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

  private updateRep(
    cfg: RepConfig,
    map: KeypointMap,
    now: number,
    map3D: KeypointMap | null
  ): CoachEvent[] {
    const events: CoachEvent[] = [];
    const turn = cfg.turnaroundTol ?? TURN;
    this.dbgTurn = turn;
    const side = bestSide(
      map,
      cfg.joint.map((j) => `left_${j}`),
      cfg.joint.map((j) => `right_${j}`)
    );
    this.tracking = side !== null;
    this.dbgSide = side;
    if (!side) {
      if (this.repState !== "WAITING") this.setRepState("WAITING", "Body not tracked");
      return events;
    }

    const pts = cfg.joint.map((j) => map[`${side}_${j}`]) as Keypoint[];
    if (pts.some((p) => !p || (p.score ?? 0) < MIN_CONF)) {
      this.tracking = false;
      if (this.repState !== "WAITING") this.setRepState("WAITING", "Landmark confidence below minimum");
      return events;
    }
    this.lastPoseConfidence = Math.min(...pts.map((p) => p.score ?? 0));

    // Prefer 3D world landmarks (BlazePose): a joint angle measured in 3D is
    // depth-invariant, so a side/45° camera on a bench press, overhead press,
    // row or pulldown no longer foreshortens the arm and warps the angle.
    const pts3 = map3D ? cfg.joint.map((j) => map3D[`${side}_${j}`]) : null;
    const use3D = !!pts3 && pts3.every((p) => p);
    this.angleFrom3D = use3D;
    const raw = use3D
      ? angle3D(pts3![0], pts3![1], pts3![2])
      : angle(pts[0], pts[1], pts[2]);
    this.smoothAngle = isNaN(this.smoothAngle) ? raw : this.smoothAngle * (1 - SMOOTH) + raw * SMOOTH;
    const ang = this.smoothAngle;
    let progress = (ang - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);

    // Overhead presses: a straight elbow only counts as "worked" when the wrist
    // is actually overhead — so arms hanging at the sides (also a straight
    // elbow) read as the start, not a rep. Fixes false setup reps + lets heavy,
    // partial-lockout presses still register.
    this.dbgWristVeto = false;
    if (cfg.requireWristAboveShoulder) {
      const wr = map[`${side}_wrist`];
      const sh = map[`${side}_shoulder`];
      // Only veto when we can clearly SEE the wrist below the shoulder. When the
      // wrist is out of frame / low-confidence at lockout (common overhead on a
      // heavy set) we keep the elbow-angle progress instead of zeroing it —
      // which previously dropped valid heavy-press reps.
      if (wr && sh && (wr.score ?? 0) >= 0.4 && wr.y >= sh.y) {
        progress = 0;
        this.dbgWristVeto = true;
      }
    }

    const prevProgress = this.prevProgress;
    this.progress = clamp(progress);
    this.prevProgress = this.progress;
    this.orientation = detectOrientation(map);

    // mode-adjusted required depth
    const dir = cfg.startAngle > cfg.activeAngle ? 1 : -1;
    const ease = this.mode === "beginner" ? 12 : this.mode === "advanced" ? -6 : 0;
    const requiredActive = cfg.activeAngle + dir * ease;
    const reqProgress = (requiredActive - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);
    this.dbgReqProgress = reqProgress;

    // ===== UP phase: at/returning to the top, waiting for the next descent =====
    if (this.phase === "up") {
      this.currentFault = null;
      this.currentJoints = [];
      this.valley = Math.min(this.valley, this.progress);
      // begin a rep the moment the user is clearly descending from the top
      if (this.progress > ENTER && this.progress > this.valley + turn) {
        this.phase = "down";
        this.peak = this.progress;
        this.resetRep();
        this.sampleStability(map);
      }
      this.updateRepState(prevProgress);
      return events;
    }

    // ===== DOWN phase: descending → bottom → starting to rise =====
    this.peak = Math.max(this.peak, this.progress);
    this.sampleStability(map);
    this.updateRepState(prevProgress);

    if (this.progress > CHECK_FROM) {
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
    }

    // Bottom turnaround: the user has reversed out of the bottom → rep is DONE.
    // Counted instantly mid-ascent — no pause or full lockout required. The
    // reversal threshold (turn) is larger for heavy lifts so a grind/pause near
    // the bottom isn't misread as multiple reps or a premature turnaround.
    if (this.progress < this.peak - turn) {
      this.phase = "up";
      this.valley = this.progress;
      this.currentFault = null;
      this.currentJoints = [];
      this.setRepState("LOCKOUT", "Reversed out of the bottom");

      // ignore fidgets / micro-movements that aren't real reps
      if (this.peak < MIN_REP_PEAK) {
        this.setRepState("READY", "Movement below minimum depth — treated as a fidget");
        return events;
      }

      const tooFast = this.lastRepTs > 0 && now - this.lastRepTs < MIN_REP_INTERVAL_MS;
      const repConfidence = avg(this.confSamples);
      const errors = this.repErrors.size;
      const warns = this.repWarns.size;
      const form = Math.max(0, 100 - errors * 30 - warns * 12);
      const stability = this.computeStability();
      const idealProgress = (cfg.idealAngle - cfg.startAngle) / (cfg.activeAngle - cfg.startAngle);
      const rom = Math.round(clamp(this.peak / idealProgress) * 100);
      const confPct = Math.round(repConfidence * 100);
      const angleSource: "3D" | "2D" = this.angleFrom3D ? "3D" : "2D";
      const round2 = (n: number) => Math.round(n * 100) / 100;
      const decide = (accepted: boolean, reason: string): RepDecision => {
        const d: RepDecision = {
          accepted,
          reason,
          rom,
          peak: round2(this.peak),
          required: round2(reqProgress),
          confidence: confPct,
          at: now,
        };
        this.lastDecision = d;
        return d;
      };
      const validationFor = (accepted: boolean, rejectionCode: RejectionCode | null) =>
        buildValidation({
          accepted,
          rejectionCode,
          peak: this.peak,
          reqProgress,
          repConfidence,
          minConf: MIN_CONF,
          formErrorCount: errors,
          stability,
          minStability: MIN_STABILITY,
          tooFast,
          strict: this.strict,
        });

      // REJECT: insufficient depth (both modes)
      if (this.peak < reqProgress) {
        const d = decide(false, cfg.incompleteCue);
        this.invalidReps += 1;
        this.faultCounts[cfg.incompleteCue] = (this.faultCounts[cfg.incompleteCue] ?? 0) + 1;
        if (!this.attemptFaults.includes(cfg.incompleteCue)) this.attemptFaults.push(cfg.incompleteCue);
        this.attempts.push({ valid: false, repNumber: 0, form, rom, stability, faults: this.attemptFaults });
        const validation = validationFor(false, "rom_too_small");
        this.lastValidation = validation;
        const prevState = this.prevRepState;
        this.setRepState("READY", cfg.incompleteCue);
        events.push({
          type: "badrep",
          reason: cfg.incompleteCue,
          peak: d.peak,
          required: d.required,
          rom,
          confidence: confPct,
          angleSource,
          state: this.repState,
          prevState,
          reasonCode: "rom_too_small",
          validation,
        });
        return events;
      }
      // REJECT: unsafe form — only in Advanced, only sustained high-confidence errors
      if (this.mode === "advanced" && errors > 0 && repConfidence >= HIGH_CONF) {
        const reason = this.firstErrorCue();
        const d = decide(false, reason);
        this.invalidReps += 1;
        this.attempts.push({ valid: false, repNumber: 0, form, rom, stability, faults: this.attemptFaults });
        const validation = validationFor(false, "unsafe_form");
        this.lastValidation = validation;
        const prevState = this.prevRepState;
        this.setRepState("READY", reason);
        events.push({
          type: "badrep",
          reason,
          peak: d.peak,
          required: d.required,
          rom,
          confidence: confPct,
          angleSource,
          state: this.repState,
          prevState,
          reasonCode: "unsafe_form",
          validation,
        });
        return events;
      }
      // REJECT (strict validation only, off by default): movement too fast
      if (this.strict && tooFast) {
        const reason = "Movement too fast — control the tempo";
        const d = decide(false, reason);
        this.invalidReps += 1;
        this.attempts.push({ valid: false, repNumber: 0, form, rom, stability, faults: this.attemptFaults });
        const validation = validationFor(false, "too_fast");
        this.lastValidation = validation;
        const prevState = this.prevRepState;
        this.setRepState("READY", reason);
        events.push({
          type: "badrep",
          reason,
          peak: d.peak,
          required: d.required,
          rom,
          confidence: confPct,
          angleSource,
          state: this.repState,
          prevState,
          reasonCode: "too_fast",
          validation,
        });
        return events;
      }
      // REJECT (strict validation only, off by default): excessive body swing
      if (this.strict && stability < MIN_STABILITY) {
        const reason = "Excessive body swing — stay controlled";
        const d = decide(false, reason);
        this.invalidReps += 1;
        this.attempts.push({ valid: false, repNumber: 0, form, rom, stability, faults: this.attemptFaults });
        const validation = validationFor(false, "unstable");
        this.lastValidation = validation;
        const prevState = this.prevRepState;
        this.setRepState("READY", reason);
        events.push({
          type: "badrep",
          reason,
          peak: d.peak,
          required: d.required,
          rom,
          confidence: confPct,
          angleSource,
          state: this.repState,
          prevState,
          reasonCode: "unstable",
          validation,
        });
        return events;
      }

      // VALID REP
      const quality: "perfect" | "good" =
        rom >= 90 && form >= 85 && stability >= 80 ? "perfect" : "good";
      const d = decide(true, quality);
      this.reps += 1;
      this.romScores.push(rom);
      this.formScores.push(form);
      this.stabilityScores.push(stability);
      this.confScores.push(confPct);
      this.attempts.push({ valid: true, repNumber: this.reps, form, rom, stability, faults: this.attemptFaults });
      this.lastRepTs = now;
      const validation = validationFor(true, null);
      this.lastValidation = validation;
      const prevState = this.prevRepState;
      this.setRepState("REP_COMPLETE", quality);
      events.push({
        type: "rep",
        reps: this.reps,
        rom,
        form,
        stability,
        confidence: confPct,
        quality,
        peak: d.peak,
        required: d.required,
        angleSource,
        state: this.repState,
        prevState,
        validation,
      });

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
      this.lastDecision = { accepted: true, reason: "generic", rom: 100, peak: 1, required: 0.35, confidence: 90, at: now };
      // Generic (unmapped poseKey) fallback doesn't run the named state
      // machine — out of scope for this phase (see ALGORITHM.md) — so these
      // are placeholders just to satisfy the shared CoachEvent shape.
      events.push({
        type: "rep",
        reps: this.reps,
        rom: 100,
        form: 100,
        stability: 100,
        confidence: 90,
        quality: "good",
        peak: 1,
        required: 0.35,
        angleSource: "2D",
        state: "REP_COMPLETE",
        prevState: "READY",
        validation: { accepted: true, checks: [], rejectionCode: null },
      });
    }
    return events;
  }

  state(): CoachState {
    const a = (arr: number[]) => (arr.length ? Math.round(avg(arr)) : null);
    const danger = this.currentFault?.severity === "error";
    const color: FormColor = this.phase !== "down"
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
      inMotion: this.phase === "down",
      fault: this.currentFault,
      faultJoints: this.currentJoints,
      danger,
      color,
      orientation: this.orientation,
      repPhase: this.repPhaseNow(),
      debug: this.debugInfo(),
    };
  }

  private debugInfo(): RepDebugInfo {
    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      side: this.dbgSide,
      joints: this.cfg.type === "rep" ? this.cfg.joint.join("→") : this.cfg.type,
      angle: isNaN(this.smoothAngle) ? null : Math.round(this.smoothAngle),
      angleSource: this.angleFrom3D ? "3D" : "2D",
      progress: round2(this.progress),
      peak: round2(this.peak),
      requiredProgress: round2(this.dbgReqProgress),
      turnaroundTol: this.dbgTurn,
      wristVeto: this.dbgWristVeto,
      lastDecision: this.lastDecision,
      state: this.repState,
      prevState: this.prevRepState,
      transitionReason: this.transitionReason,
      stateConfidence: Math.round((this.stateRunLen / SUSTAIN) * 100),
      poseConfidence: Math.round(this.lastPoseConfidence * 100),
      lastValidation: this.lastValidation,
    };
  }

  private repPhaseNow(): "idle" | "down" | "up" {
    if (this.phase !== "down") {
      this.phaseProgressPrev = this.progress;
      return "idle";
    }
    const dir = this.progress >= this.phaseProgressPrev - 0.002 ? "down" : "up";
    this.phaseProgressPrev = this.progress;
    return dir;
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
