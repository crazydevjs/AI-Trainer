// Body Lock System — locks onto ONE person and keeps tracking them in a crowd.
//
// Strategy:
//  1. Lock a target (center-most person on start, or manual pick).
//  2. Each frame, find that person by their tracking `id` (fast path).
//  3. If the id is gone (occlusion / id churn / left frame), re-identify by
//     body signature (position + size) — never switch to a random person.
//  4. Hold a grace window before declaring the user "lost"; keep re-acquiring
//     even after, so they're recovered when they return.

import type { Keypoint } from "./angles";

export interface Pose {
  keypoints: Keypoint[];
  score?: number;
  id?: number;
}

export type LockStatus = "idle" | "locked" | "searching" | "lost";

export interface LockState {
  status: LockStatus;
  lockedId: number | null;
  confidence: number; // 0..100
  lostFrames: number;
  peopleCount: number;
}

export interface Box {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

interface Signature {
  cx: number;
  cy: number;
  size: number;
}

const GRACE_MS = 4000; // wait this long (occlusion) before "lost"
const REID_MAX_DIST = 0.22; // max centroid move (fraction of frame diagonal)
const REID_MIN_RATIO = 0.55; // size similarity bounds
const REID_MAX_RATIO = 1.8;

/** Bounding box from confident keypoints, or null. */
export function poseBox(keypoints: Keypoint[], minScore = 0.3): Box | null {
  let xMin = Infinity,
    yMin = Infinity,
    xMax = -Infinity,
    yMax = -Infinity,
    n = 0;
  for (const k of keypoints) {
    if ((k.score ?? 0) >= minScore) {
      xMin = Math.min(xMin, k.x);
      yMin = Math.min(yMin, k.y);
      xMax = Math.max(xMax, k.x);
      yMax = Math.max(yMax, k.y);
      n++;
    }
  }
  if (n < 2) return null;
  return {
    xMin,
    yMin,
    xMax,
    yMax,
    cx: (xMin + xMax) / 2,
    cy: (yMin + yMax) / 2,
    w: xMax - xMin,
    h: yMax - yMin,
  };
}

function signatureOf(p: Pose): Signature | null {
  const b = poseBox(p.keypoints);
  if (!b) return null;
  return { cx: b.cx, cy: b.cy, size: Math.hypot(b.w, b.h) };
}

export class BodyLock {
  status: LockStatus = "idle";
  lockedId: number | null = null;
  confidence = 0;
  lostFrames = 0;
  peopleCount = 0;

  private sig: Signature | null = null;
  private lastSeen = 0;

  reset() {
    this.status = "idle";
    this.lockedId = null;
    this.sig = null;
    this.confidence = 0;
    this.lostFrames = 0;
  }

  private adopt(p: Pose, now: number, confidence: number) {
    this.lockedId = p.id ?? this.lockedId ?? 0;
    this.sig = signatureOf(p) ?? this.sig;
    this.status = "locked";
    this.lostFrames = 0;
    this.lastSeen = now;
    this.confidence = confidence;
  }

  /** Lock the person nearest the frame center (tie-break larger/closer). */
  lockCenter(poses: Pose[], frameW: number, frameH: number, now: number) {
    if (!poses.length) return;
    const cx = frameW / 2;
    const cy = frameH / 2;
    let best: Pose | null = null;
    let bestScore = Infinity;
    for (const p of poses) {
      const s = signatureOf(p);
      if (!s) continue;
      // prefer centered AND large (closer) bodies
      const d = Math.hypot(s.cx - cx, s.cy - cy) - s.size * 0.5;
      if (d < bestScore) {
        bestScore = d;
        best = p;
      }
    }
    if (best) this.adopt(best, now, Math.round((best.score ?? 0.85) * 100));
  }

  /** Lock the person whose box contains the given point (manual click). */
  lockAt(poses: Pose[], x: number, y: number, now: number): boolean {
    for (const p of poses) {
      const b = poseBox(p.keypoints);
      if (b && x >= b.xMin && x <= b.xMax && y >= b.yMin && y <= b.yMax) {
        this.adopt(p, now, Math.round((p.score ?? 0.85) * 100));
        return true;
      }
    }
    return false;
  }

  /** Per-frame: returns the locked pose for this frame, or null if not present. */
  update(poses: Pose[], now: number, frameW: number, frameH: number): Pose | null {
    this.peopleCount = poses.length;
    if (this.status === "idle") return null;

    // Fast path: same tracking id still visible.
    if (this.lockedId != null) {
      const same = poses.find((p) => p.id === this.lockedId);
      if (same) {
        this.adopt(same, now, Math.round((same.score ?? 0.85) * 100));
        return same;
      }
    }

    // Re-identify by body signature (position + size).
    if (this.sig) {
      const diag = Math.hypot(frameW, frameH) || 1;
      let best: Pose | null = null;
      let bestD = Infinity;
      for (const p of poses) {
        const s = signatureOf(p);
        if (!s) continue;
        const d = Math.hypot(s.cx - this.sig.cx, s.cy - this.sig.cy) / diag;
        const ratio = s.size / this.sig.size;
        if (
          d <= REID_MAX_DIST &&
          ratio >= REID_MIN_RATIO &&
          ratio <= REID_MAX_RATIO &&
          d < bestD
        ) {
          bestD = d;
          best = p;
        }
      }
      if (best) {
        this.adopt(best, now, Math.max(40, Math.round((1 - bestD / REID_MAX_DIST) * 100)));
        return best;
      }
    }

    // Not found this frame — hold through the grace window.
    this.lostFrames++;
    const elapsed = now - this.lastSeen;
    this.status = elapsed > GRACE_MS ? "lost" : "searching";
    this.confidence = Math.max(0, this.confidence - 2);
    return null;
  }

  state(): LockState {
    return {
      status: this.status,
      lockedId: this.lockedId,
      confidence: this.confidence,
      lostFrames: this.lostFrames,
      peopleCount: this.peopleCount,
    };
  }
}
