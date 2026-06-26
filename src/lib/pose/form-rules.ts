// Exercise-specific real-time form checks, evaluated each frame during a rep.
// Detectors use MoveNet 2D keypoints. Back-rounding is approximated via the
// ear–shoulder–hip angle (works best from a side view); knee valgus, lean,
// body-line and balance are reliable from the front.

import { angle, angleFromVertical, type Keypoint, type KeypointMap } from "./angles";

export type Severity = "error" | "warn";

export interface FormCheck {
  id: string;
  cue: string;
  severity: Severity;
  /** keypoints to highlight red when this fault is active */
  joints: (side: "left" | "right") => string[];
  /** true = good, false = fault. Return true when data is missing. */
  test: (map: KeypointMap, side: "left" | "right") => boolean;
}

const ok = (k?: Keypoint) => (k?.score ?? 0) >= 0.3;

// --- detectors ------------------------------------------------------------

function chestUp(maxLean: number, severity: Severity = "warn", cue = "Keep your chest up"): FormCheck {
  return {
    id: "chest",
    cue,
    severity,
    joints: (s) => [`${s}_shoulder`, `${s}_hip`],
    test: (m, s) => {
      const sh = m[`${s}_shoulder`];
      const hip = m[`${s}_hip`];
      if (!ok(sh) || !ok(hip)) return true;
      return angleFromVertical(sh, hip) <= maxLean;
    },
  };
}

/** Spine straightness via ear/nose – shoulder – hip. Lower angle = rounded/hunched. */
function backStraight(minAngle: number, severity: Severity, cue = "Keep your back straight"): FormCheck {
  return {
    id: "back",
    cue,
    severity,
    joints: (s) => [`${s}_shoulder`, `${s}_hip`],
    test: (m, s) => {
      const sh = m[`${s}_shoulder`];
      const hip = m[`${s}_hip`];
      if (!ok(sh) || !ok(hip)) return true;
      const head = ok(m[`${s}_ear`]) ? m[`${s}_ear`] : ok(m.nose) ? m.nose : null;
      if (!head) return true;
      return angle(head, sh, hip) >= minAngle;
    },
  };
}

/** shoulder-hip-knee straight (no hip sag / pike). */
function bodyStraight(minAngle: number, cue: string, severity: Severity = "warn"): FormCheck {
  return {
    id: "bodyline",
    cue,
    severity,
    joints: (s) => [`${s}_hip`],
    test: (m, s) => {
      const sh = m[`${s}_shoulder`];
      const hip = m[`${s}_hip`];
      const kn = m[`${s}_knee`];
      if (!ok(sh) || !ok(hip) || !ok(kn)) return true;
      return angle(sh, hip, kn) >= minAngle;
    },
  };
}

/** Knees tracking over feet (front view) — flags valgus collapse. */
function kneesOut(minRatio: number): FormCheck {
  return {
    id: "knees",
    cue: "Push your knees out",
    severity: "error",
    joints: () => ["left_knee", "right_knee"],
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

/** Hips level (balance / even weight). */
function balanced(maxDelta: number): FormCheck {
  return {
    id: "balance",
    cue: "Stay balanced — even on both sides",
    severity: "warn",
    joints: () => ["left_hip", "right_hip"],
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

const SQUAT = [
  kneesOut(0.6),
  backStraight(146, "error", "Straighten your back — don't round it"),
  chestUp(62, "warn", "Keep your chest up"),
  balanced(0.18),
];

const FORM_CHECKS: Record<string, FormCheck[]> = {
  squat: SQUAT,
  "front-squat": SQUAT,
  lunge: [chestUp(58, "warn"), backStraight(150, "warn"), balanced(0.2)],
  "push-up": [
    bodyStraight(150, "Keep your body straight — don't drop your hips", "error"),
  ],
  "bench-press": [], // lying: 2D form checks unreliable; depth + tempo only
  deadlift: [
    backStraight(150, "error", "Keep your back straight — chest up, flat spine"),
    balanced(0.2),
  ],
  rdl: [
    backStraight(150, "error", "Keep your back straight — flat spine"),
  ],
  "shoulder-press": [
    chestUp(30, "warn", "Keep your torso tall — don't lean back"),
  ],
  plank: [bodyStraight(150, "Keep your body straight", "warn")],
};

export function getFormChecks(poseKey?: string | null): FormCheck[] {
  if (poseKey && FORM_CHECKS[poseKey]) return FORM_CHECKS[poseKey];
  return [];
}
