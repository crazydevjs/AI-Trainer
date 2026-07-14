// Per-user body calibration, derived once from the onboarding height + a
// stable camera-check frame. Scale (px-per-cm) uses Profile.heightCm as
// ground truth rather than trying to estimate height from pose alone, since
// a single monocular frame can't recover that reliably. Everything below is
// computed, not looked up — treat a null result as "couldn't calibrate this
// frame", not an error.

import type { Keypoint, KeypointMap } from "./angles";
import { detectOrientation, type Orientation } from "./form-rules";

export interface CalibrationProfile {
  heightCm: number;
  pxPerCm: number;
  shoulderWidthCm: number | null;
  hipWidthCm: number | null;
  armLengthCm: number | null;
  legLengthCm: number | null;
  torsoLengthCm: number | null;
  /** relative framing from bounding-box height vs frame height — not an
   *  absolute distance, which isn't recoverable without camera intrinsics. */
  framing: "close" | "ideal" | "far";
  /** camera roll only (shoulder/hip line vs horizontal). Pitch/yaw of the
   *  camera itself isn't derivable from a single 2D pose. */
  cameraRollDeg: number | null;
  orientation: Orientation;
  /** left/right limb-length agreement, 0..1 — a sanity check, not a fault. */
  symmetryConfidence: number | null;
  capturedAt: number;
}

const MIN_CONF = 0.3;
// Ear/eye line sits below the crown of the head; this allowance approximates
// full standing height from the ear-to-ankle span.
const HEAD_CROWN_FACTOR = 1.08;

const seen = (k?: Keypoint) => (k?.score ?? 0) >= MIN_CONF;
const dist = (a: Keypoint, b: Keypoint) => Math.hypot(a.x - b.x, a.y - b.y);
const midY = (a?: Keypoint, b?: Keypoint): number | null => {
  if (seen(a) && seen(b)) return (a!.y + b!.y) / 2;
  return seen(a) ? a!.y : seen(b) ? b!.y : null;
};

export function estimateCalibration(
  map: KeypointMap,
  heightCm: number | null | undefined,
  frameH: number
): CalibrationProfile | null {
  if (!heightCm || heightCm < 100 || heightCm > 230) return null;

  const headY = midY(map.left_ear, map.right_ear) ?? (seen(map.nose) ? map.nose.y : null);
  const ankleY = midY(map.left_ankle, map.right_ankle);
  if (headY == null || ankleY == null) return null;

  const spanPx = ankleY - headY;
  if (spanPx <= 0) return null;
  const fullHeightPx = spanPx * HEAD_CROWN_FACTOR;
  const pxPerCm = fullHeightPx / heightCm;
  if (!Number.isFinite(pxPerCm) || pxPerCm <= 0) return null;

  const toCm = (px: number) => Math.round((px / pxPerCm) * 10) / 10;

  const shoulderWidthCm =
    seen(map.left_shoulder) && seen(map.right_shoulder)
      ? toCm(dist(map.left_shoulder, map.right_shoulder))
      : null;
  const hipWidthCm =
    seen(map.left_hip) && seen(map.right_hip) ? toCm(dist(map.left_hip, map.right_hip)) : null;

  const sideArmPx = (side: "left" | "right") => {
    const sh = map[`${side}_shoulder`];
    const el = map[`${side}_elbow`];
    const wr = map[`${side}_wrist`];
    if (!seen(sh) || !seen(el) || !seen(wr)) return null;
    return dist(sh, el) + dist(el, wr);
  };
  const sideLegPx = (side: "left" | "right") => {
    const hip = map[`${side}_hip`];
    const kn = map[`${side}_knee`];
    const an = map[`${side}_ankle`];
    if (!seen(hip) || !seen(kn) || !seen(an)) return null;
    return dist(hip, kn) + dist(kn, an);
  };

  const armL = sideArmPx("left");
  const armR = sideArmPx("right");
  const armPx = armL != null && armR != null ? (armL + armR) / 2 : (armL ?? armR);
  const legL = sideLegPx("left");
  const legR = sideLegPx("right");
  const legPx = legL != null && legR != null ? (legL + legR) / 2 : (legL ?? legR);

  const ratio = (a: number, b: number) => 1 - Math.abs(a - b) / ((a + b) / 2);
  const armSym = armL != null && armR != null ? ratio(armL, armR) : null;
  const legSym = legL != null && legR != null ? ratio(legL, legR) : null;
  const symmetryConfidence =
    armSym != null && legSym != null
      ? (armSym + legSym) / 2
      : (armSym ?? legSym ?? null);

  const shMidY = midY(map.left_shoulder, map.right_shoulder);
  const hipMidY = midY(map.left_hip, map.right_hip);
  const torsoLengthCm = shMidY != null && hipMidY != null ? toCm(Math.abs(shMidY - hipMidY)) : null;

  const framingRatio = fullHeightPx / frameH;
  const framing: CalibrationProfile["framing"] =
    framingRatio < 0.45 ? "far" : framingRatio > 0.85 ? "close" : "ideal";

  let cameraRollDeg: number | null = null;
  if (seen(map.left_shoulder) && seen(map.right_shoulder)) {
    const dx = map.right_shoulder.x - map.left_shoulder.x;
    const dy = map.right_shoulder.y - map.left_shoulder.y;
    cameraRollDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  } else if (seen(map.left_hip) && seen(map.right_hip)) {
    const dx = map.right_hip.x - map.left_hip.x;
    const dy = map.right_hip.y - map.left_hip.y;
    cameraRollDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  }

  return {
    heightCm,
    pxPerCm: Math.round(pxPerCm * 1000) / 1000,
    shoulderWidthCm,
    hipWidthCm,
    armLengthCm: armPx != null ? toCm(armPx) : null,
    legLengthCm: legPx != null ? toCm(legPx) : null,
    torsoLengthCm,
    framing,
    cameraRollDeg,
    orientation: detectOrientation(map),
    symmetryConfidence: symmetryConfidence != null ? Math.round(symmetryConfidence * 100) / 100 : null,
    capturedAt: Date.now(),
  };
}

const KEY = "forge_calibration";

export function loadCalibration(): CalibrationProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalibrationProfile;
  } catch {
    return null;
  }
}

export function saveCalibration(p: CalibrationProfile) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  }
}
