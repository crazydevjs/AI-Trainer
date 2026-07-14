// Temporal smoothing for the Form Analysis Engine. IssueTracker turns raw,
// single-frame RawIssue samples into stable started/ongoing/resolved
// DetectedIssues, debounced the same way rep-counter.ts debounces its own
// form-check status (a multi-frame run-length before a status is trusted) —
// the pattern is reused, not the code, since rep-counter.ts itself is not
// touched by this engine.

import { classifySeverity } from "./severity";
import type { DetectedIssue, IssueId, IssueLogEntry, RawIssue } from "./types";

const ACTIVATE_FRAMES = 5; // consecutive frames before an issue is trusted
const CLEAR_FRAMES = 10; // consecutive clean frames before it's marked resolved

interface Runtime {
  active: boolean;
  status: "started" | "ongoing";
  runLen: number;
  clearLen: number;
  firstSeenAt: number;
  lastSeenAt: number;
  occurrences: number;
  magnitudeSum: number;
  magnitudeCount: number;
  peakMagnitude: number;
  confidenceSum: number;
}

function newRuntime(): Runtime {
  return {
    active: false,
    status: "started",
    runLen: 0,
    clearLen: 0,
    firstSeenAt: 0,
    lastSeenAt: 0,
    occurrences: 0,
    magnitudeSum: 0,
    magnitudeCount: 0,
    peakMagnitude: 0,
    confidenceSum: 0,
  };
}

export class IssueTracker {
  private runtime = new Map<IssueId, Runtime>();
  private log: IssueLogEntry[] = [];

  update(samples: RawIssue[], now: number): DetectedIssue[] {
    const bySample = new Map<IssueId, RawIssue>();
    for (const s of samples) {
      const existing = bySample.get(s.id);
      if (!existing || s.magnitude > existing.magnitude) bySample.set(s.id, s);
    }

    const active: DetectedIssue[] = [];
    const ids = new Set<IssueId>([...this.runtime.keys(), ...bySample.keys()]);

    for (const id of ids) {
      const sample = bySample.get(id);
      const rt = this.runtime.get(id) ?? newRuntime();
      this.runtime.set(id, rt);

      if (sample) {
        rt.runLen++;
        rt.clearLen = 0;
        rt.lastSeenAt = now;
        rt.magnitudeSum += sample.magnitude;
        rt.magnitudeCount++;
        rt.peakMagnitude = Math.max(rt.peakMagnitude, sample.magnitude);
        rt.confidenceSum += sample.confidence;
        if (!rt.active && rt.runLen >= ACTIVATE_FRAMES) {
          rt.active = true;
          rt.status = "started";
          rt.firstSeenAt = now;
          rt.occurrences++;
        } else if (rt.active) {
          rt.status = "ongoing";
        }
      } else {
        rt.runLen = 0;
        rt.clearLen++;
        if (rt.active && rt.clearLen >= CLEAR_FRAMES) {
          this.sealEntry(id, rt, now, rt.lastSeenAt);
          rt.active = false;
          rt.magnitudeSum = 0;
          rt.magnitudeCount = 0;
          rt.peakMagnitude = 0;
          rt.confidenceSum = 0;
        }
      }

      if (rt.active && sample) {
        const avgConfidence = rt.confidenceSum / Math.max(1, rt.magnitudeCount);
        const avgMagnitude = rt.magnitudeSum / Math.max(1, rt.magnitudeCount);
        active.push({
          id,
          status: rt.status,
          severity: classifySeverity({
            durationMs: now - rt.firstSeenAt,
            occurrences: rt.occurrences,
            magnitude: rt.peakMagnitude,
            phase: "ongoing",
            confidence: avgConfidence,
          }),
          confidence: avgConfidence,
          magnitude: avgMagnitude,
          affectedJoints: sample.affectedJoints,
          correction: sample.correction,
          firstSeenAt: rt.firstSeenAt,
          durationMs: now - rt.firstSeenAt,
          occurrences: rt.occurrences,
        });
      }

      if (!rt.active && rt.runLen === 0 && rt.occurrences === 0 && !sample) {
        this.runtime.delete(id);
      }
    }

    return active;
  }

  private sealEntry(id: IssueId, rt: Runtime, resolvedAt: number | null, lastSeenAt: number) {
    const avgConfidence = rt.magnitudeCount ? rt.confidenceSum / rt.magnitudeCount : 0;
    this.log.push({
      id,
      severity: classifySeverity({
        durationMs: lastSeenAt - rt.firstSeenAt,
        occurrences: rt.occurrences,
        magnitude: rt.peakMagnitude,
        phase: resolvedAt ? "resolved" : "ongoing",
        confidence: avgConfidence,
      }),
      firstSeenAt: rt.firstSeenAt,
      resolvedAt,
      durationMs: lastSeenAt - rt.firstSeenAt,
      occurrences: rt.occurrences,
      peakMagnitude: rt.peakMagnitude,
      avgConfidence,
    });
  }

  /** Session end: seal any issue still open as an unresolved log entry. */
  finalize(now: number): IssueLogEntry[] {
    for (const [id, rt] of this.runtime) {
      if (rt.active) this.sealEntry(id, rt, null, now);
    }
    return this.log;
  }

  getLog(): IssueLogEntry[] {
    return this.log;
  }
}

/** Rolling standard deviation over a capped window — used for sway/stability. */
export class RollingStat {
  private buf: number[] = [];
  constructor(private capacity = 30) {}
  push(v: number) {
    this.buf.push(v);
    if (this.buf.length > this.capacity) this.buf.shift();
  }
  get stdDev(): number | null {
    if (this.buf.length < 5) return null;
    const mean = this.buf.reduce((a, b) => a + b, 0) / this.buf.length;
    const variance = this.buf.reduce((a, b) => a + (b - mean) ** 2, 0) / this.buf.length;
    return Math.sqrt(variance);
  }
  /** Mean of the current window — used by the Movement Intelligence Engine
   *  for jerk-magnitude smoothness scoring (see movement-engine/scoring.ts). */
  get mean(): number | null {
    if (!this.buf.length) return null;
    return this.buf.reduce((a, b) => a + b, 0) / this.buf.length;
  }
  reset() {
    this.buf = [];
  }
}

/** Rolling minimum — used as a "resting/flat" baseline for heel/toe lift. */
export class RollingMin {
  private value: number | null = null;
  push(v: number) {
    this.value = this.value == null ? v : Math.min(this.value, v);
  }
  get min(): number | null {
    return this.value;
  }
  reset() {
    this.value = null;
  }
}

/** Rolling min/max range — used for wrist-trajectory (bar path) deviation. */
export class RollingRange {
  private minV: number | null = null;
  private maxV: number | null = null;
  push(v: number) {
    this.minV = this.minV == null ? v : Math.min(this.minV, v);
    this.maxV = this.maxV == null ? v : Math.max(this.maxV, v);
  }
  get range(): number | null {
    return this.minV != null && this.maxV != null ? this.maxV - this.minV : null;
  }
  reset() {
    this.minV = null;
    this.maxV = null;
  }
}
