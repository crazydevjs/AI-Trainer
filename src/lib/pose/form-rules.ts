// Exercise-specific real-time form checks, evaluated each frame during a rep.
// Detectors use MoveNet 2D keypoints, so we only include faults that are
// reliably visible from a single webcam (depth, lean, knee valgus, body line,
// balance). Each fault has a simple-English cue, a severity, and a color.

import { angle, angleFromVertical, type Keypoint, type KeypointMap } from "./angles";

export type Severity = "error" | "warn";

export interface FormCheck {
  id: string;
  cue: string;
  severity: Severity;
  /** true = good, false = fault. Return true when data is missing (no false alarms). */
  test: (map: KeypointMap, side: "left" | "right") => boolean;
}

const ok = (k?: Keypoint) => (k?.score ?? 0) >= 0.3;

// --- reusable detectors ---------------------------------------------------

/** Torso (shoulder→hip) must stay reasonably upright; flags excessive lean. */
function chestUp(maxLean: number, severity: Severity = "warn"): FormCheck {
  return {
    id: "chest",
    cue: "Keep your chest up",
    severity,
    test: (m, s) => {
      const sh = m[`${s}_shoulder`];
      const hip = m[`${s}_hip`];
      if (!ok(sh) || !ok(hip)) return true;
      return angleFromVertical(sh, hip) <= maxLean;
    },
  };
}

/** shoulder-hip-knee should stay straight (no hip sag / pike). */
function bodyStraight(minAngle: number, cue: string, severity: Severity = "warn"): FormCheck {
  return {
    id: "bodyline",
    cue,
    severity,
    test: (m, s) => {
      const sh = m[`${s}_shoulder`];
      const hip = m[`${s}_hip`];
      const kn = m[`${s}_knee`];
      if (!ok(sh) || !ok(hip) || !ok(kn)) return true;
      return angle(sh, hip, kn) >= minAngle;
    },
  };
}

/** Knees must stay tracking over the feet (front view) — flags valgus. */
function kneesOut(minRatio: number): FormCheck {
  return {
    id: "knees",
    cue: "Push your knees out",
    severity: "error",
    test: (m) => {
      const lk = m.left_knee;
      const rk = m.right_knee;
      const la = m.left_ankle;
      const ra = m.right_ankle;
      if (!ok(lk) || !ok(rk) || !ok(la) || !ok(ra)) return true;
      const kneeW = Math.abs(lk.x - rk.x);
      const ankleW = Math.abs(la.x - ra.x);
      if (ankleW < 1) return true;
      return kneeW / ankleW >= minRatio;
    },
  };
}

/** Hips should stay level (balance / even weight). */
function balanced(maxDelta: number): FormCheck {
  return {
    id: "balance",
    cue: "Stay balanced",
    severity: "warn",
    test: (m) => {
      const lh = m.left_hip;
      const rh = m.right_hip;
      const ls = m.left_shoulder;
      if (!ok(lh) || !ok(rh) || !ok(ls)) return true;
      const torso = Math.abs(ls.y - lh.y) || 1;
      return Math.abs(lh.y - rh.y) / torso <= maxDelta;
    },
  };
}

// --- per-exercise rule sets ----------------------------------------------

const SQUAT = [kneesOut(0.6), chestUp(62, "warn"), balanced(0.18)];
const PUSHUP = [bodyStraight(150, "Keep your body straight — don't drop your hips", "warn")];
const PLANK = [bodyStraight(150, "Keep your body straight", "warn")];

const FORM_CHECKS: Record<string, FormCheck[]> = {
  squat: SQUAT,
  "front-squat": SQUAT,
  lunge: [chestUp(58, "warn"), balanced(0.2)],
  "push-up": PUSHUP,
  "bench-press": PUSHUP,
  plank: PLANK,
  // hinge/press/pull movements: depth gate + tempo only (back rounding can't be
  // reliably measured in 2D, so we don't false-reject on it).
};

export function getFormChecks(poseKey?: string | null): FormCheck[] {
  if (poseKey && FORM_CHECKS[poseKey]) return FORM_CHECKS[poseKey];
  return [];
}
