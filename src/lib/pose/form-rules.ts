// View-aware, tolerance-banded form checks. Each check reports ok / warn / error
// plus a confidence, and declares which camera view it's valid in — so we never
// fault on a measurement the angle can't support (a big source of false alarms).

import { angle, angleFromVertical, type Keypoint, type KeypointMap } from "./angles";

export type Severity = "error" | "warn";
export type Mode = "beginner" | "advanced";
export type View = "side" | "front" | "45" | "any";
export type Orientation = "front" | "side" | "45" | "unknown";

export interface CheckResult {
  status: "ok" | "warn" | "error";
  confidence: number; // 0..1 (min keypoint score used)
}

export interface FormCheck {
  id: string;
  cue: string;
  /** camera view this check is meaningful in */
  view: View;
  joints: (side: "left" | "right") => string[];
  evaluate: (map: KeypointMap, side: "left" | "right", mode: Mode) => CheckResult | null;
}

const sc = (k?: Keypoint) => k?.score ?? 0;
const seen = (k?: Keypoint) => sc(k) >= 0.3;

/** Classify a measured value against [warn,error] bands.
 *  dir "min": higher is better (fault when below). "max": lower is better. */
function band(value: number, warn: number, error: number, dir: "min" | "max"): "ok" | "warn" | "error" {
  if (dir === "min") return value < error ? "error" : value < warn ? "warn" : "ok";
  return value > error ? "error" : value > warn ? "warn" : "ok";
}

// thresholds[mode] = [warn, error]
type Bands = Record<Mode, [number, number]>;

function chestUp(view: View, cue: string): FormCheck {
  const bands: Bands = { beginner: [68, 88], advanced: [52, 70] };
  return {
    id: "chest",
    cue,
    view,
    joints: (s) => [`${s}_shoulder`, `${s}_hip`],
    evaluate: (m, s, mode) => {
      const sh = m[`${s}_shoulder`];
      const hip = m[`${s}_hip`];
      if (!seen(sh) || !seen(hip)) return null;
      const [w, e] = bands[mode];
      return { status: band(angleFromVertical(sh, hip), w, e, "max"), confidence: Math.min(sc(sh), sc(hip)) };
    },
  };
}

function backStraight(view: View, cue: string): FormCheck {
  const bands: Bands = { beginner: [148, 132], advanced: [158, 144] };
  return {
    id: "back",
    cue,
    view,
    joints: (s) => [`${s}_shoulder`, `${s}_hip`],
    evaluate: (m, s, mode) => {
      const sh = m[`${s}_shoulder`];
      const hip = m[`${s}_hip`];
      const head = seen(m[`${s}_ear`]) ? m[`${s}_ear`] : seen(m.nose) ? m.nose : undefined;
      if (!seen(sh) || !seen(hip) || !head) return null;
      const [w, e] = bands[mode];
      return {
        status: band(angle(head, sh, hip), w, e, "min"),
        confidence: Math.min(sc(sh), sc(hip), sc(head)),
      };
    },
  };
}

function kneesOut(cue: string): FormCheck {
  const bands: Bands = { beginner: [0.55, 0.42], advanced: [0.68, 0.54] };
  return {
    id: "knees",
    cue,
    view: "front", // valgus is only visible from the front
    joints: () => ["left_knee", "right_knee"],
    evaluate: (m, _s, mode) => {
      const lk = m.left_knee;
      const rk = m.right_knee;
      const la = m.left_ankle;
      const ra = m.right_ankle;
      if (!seen(lk) || !seen(rk) || !seen(la) || !seen(ra)) return null;
      const ankleW = Math.abs(la.x - ra.x);
      if (ankleW < 1) return null;
      const ratio = Math.abs(lk.x - rk.x) / ankleW;
      const [w, e] = bands[mode];
      return { status: band(ratio, w, e, "min"), confidence: Math.min(sc(lk), sc(rk), sc(la), sc(ra)) };
    },
  };
}

function bodyStraight(view: View, cue: string): FormCheck {
  const bands: Bands = { beginner: [148, 130], advanced: [158, 144] };
  return {
    id: "bodyline",
    cue,
    view,
    joints: (s) => [`${s}_hip`],
    evaluate: (m, s, mode) => {
      const sh = m[`${s}_shoulder`];
      const hip = m[`${s}_hip`];
      const kn = m[`${s}_knee`];
      if (!seen(sh) || !seen(hip) || !seen(kn)) return null;
      const [w, e] = bands[mode];
      return { status: band(angle(sh, hip, kn), w, e, "min"), confidence: Math.min(sc(sh), sc(hip), sc(kn)) };
    },
  };
}

function balanced(cue: string): FormCheck {
  const bands: Bands = { beginner: [0.2, 99], advanced: [0.12, 99] }; // never "error"
  return {
    id: "balance",
    cue,
    view: "any",
    joints: () => ["left_hip", "right_hip"],
    evaluate: (m, _s, mode) => {
      const lh = m.left_hip;
      const rh = m.right_hip;
      const ls = m.left_shoulder;
      if (!seen(lh) || !seen(rh) || !seen(ls)) return null;
      const torso = Math.abs(ls.y - lh.y) || 1;
      const [w, e] = bands[mode];
      return { status: band(Math.abs(lh.y - rh.y) / torso, w, e, "max"), confidence: Math.min(sc(lh), sc(rh)) };
    },
  };
}

const SQUAT = [
  backStraight("side", "Keep your back straight"),
  kneesOut("Push your knees out"),
  chestUp("any", "Keep your chest up"),
  balanced("Stay balanced"),
];

const FORM_CHECKS: Record<string, FormCheck[]> = {
  squat: SQUAT,
  "front-squat": SQUAT,
  lunge: [chestUp("any", "Keep your chest up"), balanced("Stay balanced")],
  "push-up": [bodyStraight("side", "Keep your body straight — don't drop your hips")],
  deadlift: [backStraight("side", "Keep your back straight"), balanced("Stay balanced")],
  rdl: [backStraight("side", "Keep your back straight")],
  "shoulder-press": [chestUp("any", "Keep your torso tall")],
  // bench-press, curls, rows: depth + tempo only (no reliable 2D form fault)
};

export function getFormChecks(poseKey?: string | null): FormCheck[] {
  return (poseKey && FORM_CHECKS[poseKey]) || [];
}

/** Front vs side vs 45 from shoulder spread relative to torso height. */
export function detectOrientation(map: KeypointMap): Orientation {
  const ls = map.left_shoulder;
  const rs = map.right_shoulder;
  const lh = map.left_hip;
  const rh = map.right_hip;
  if (seen(ls) && seen(rs)) {
    const torso = Math.abs((ls.y + rs.y) / 2 - ((lh?.y ?? ls.y) + (rh?.y ?? rs.y)) / 2) || 1;
    const ratio = Math.abs(ls.x - rs.x) / torso;
    return ratio > 0.6 ? "front" : ratio < 0.32 ? "side" : "45";
  }
  if (seen(ls) || seen(rs)) return "side";
  return "unknown";
}

/** Does the current orientation support this check's view? */
export function viewMatches(view: View, o: Orientation): boolean {
  if (view === "any") return true;
  if (o === "unknown") return false; // can't trust → skip (no false fault)
  if (view === "45") return o === "45" || o === "side" || o === "front";
  return view === o;
}
