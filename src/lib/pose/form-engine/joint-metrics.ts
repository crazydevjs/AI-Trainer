// Stateless, per-frame joint geometry for the Form Analysis Engine. Reuses the
// existing geometry primitives from angles.ts and orientation detection from
// form-rules.ts rather than re-deriving them — this file only combines them
// into higher-level, exercise-agnostic metrics, self-normalized by the
// subject's own torso length each frame (camera-resolution independence
// without needing the Calibration Engine's stored profile).
//
// Statelessness is deliberate: anything that needs history (sway variance,
// baselines) lives in engine.ts, which owns the per-session temporal state.

import { angle, angleFromVertical, bestSide, type Keypoint, type KeypointMap } from "../angles";
import { detectOrientation, type Orientation } from "../form-rules";

const sc = (k?: Keypoint) => k?.score ?? 0;
const seen = (k?: Keypoint, min = 0.3) => sc(k) >= min;

export interface JointMetrics {
  side: "left" | "right" | null;
  orientation: Orientation;
  confidence: number; // 0..1
  shoulderTiltDeg: number | null;
  hipTiltDeg: number | null;
  torsoLeanDeg: number | null;
  torsoLengthPx: number | null;
  backAngleDeg: number | null; // head-shoulder-hip — spine rounding proxy
  bodyLineDeg: number | null; // shoulder-hip-knee — plank/push-up line
  headDropDeg: number | null;
  kneeValgusRatio: number | null; // knee-width / ankle-width; <1 = knees caving in
  hipOffsetFromAnkleNorm: number | null; // lateral hip drift, normalized by torso length
  elbowFlareDeg: { left: number | null; right: number | null }; // hip-shoulder-elbow
  wristX: { left: number | null; right: number | null };
  wristY: { left: number | null; right: number | null };
  shoulderDepthDeltaNorm: number | null; // 3D torso-rotation proxy (BlazePose only)
  heelAboveAnkleNorm: { left: number | null; right: number | null }; // BlazePose foot keypoints only
  toeAboveAnkleNorm: { left: number | null; right: number | null };
  earShoulderGapNorm: number | null; // shrink = shoulders elevated toward the ears
  /** Dual-sided (unlike backAngleDeg/bodyLineDeg above, which pick one best
   *  side) — for the Movement Intelligence Engine's left/right symmetry
   *  analysis. hip-knee-ankle flexion angle per side. */
  kneeAngleDeg: { left: number | null; right: number | null };
  /** shoulder-elbow-wrist flexion angle per side (distinct from
   *  elbowFlareDeg's hip-shoulder-elbow abduction angle above). */
  elbowAngleDeg: { left: number | null; right: number | null };
  /** hip height relative to shoulder midline, normalized by torso length,
   *  per side — a proxy for uneven squat/hinge depth left vs right. */
  hipHeightNorm: { left: number | null; right: number | null };
}

export function computeJointMetrics(map2D: KeypointMap, map3D: KeypointMap | null): JointMetrics {
  const side = bestSide(
    map2D,
    ["left_shoulder", "left_hip", "left_knee"],
    ["right_shoulder", "right_hip", "right_knee"]
  );
  const sideKey = side ?? "left";

  const ls = map2D.left_shoulder;
  const rs = map2D.right_shoulder;
  const lh = map2D.left_hip;
  const rh = map2D.right_hip;
  const lk = map2D.left_knee;
  const rk = map2D.right_knee;
  const la = map2D.left_ankle;
  const ra = map2D.right_ankle;

  const shoulderTiltDeg =
    seen(ls) && seen(rs) ? (Math.atan2(rs.y - ls.y, rs.x - ls.x) * 180) / Math.PI : null;
  const hipTiltDeg =
    seen(lh) && seen(rh) ? (Math.atan2(rh.y - lh.y, rh.x - lh.x) * 180) / Math.PI : null;

  const shMidX = seen(ls) && seen(rs) ? (ls.x + rs.x) / 2 : null;
  const shMidY = seen(ls) && seen(rs) ? (ls.y + rs.y) / 2 : null;
  const hipMidX = seen(lh) && seen(rh) ? (lh.x + rh.x) / 2 : null;
  const hipMidY = seen(lh) && seen(rh) ? (lh.y + rh.y) / 2 : null;
  const ankleMidX = seen(la) && seen(ra) ? (la.x + ra.x) / 2 : null;

  let torsoLeanDeg: number | null = null;
  let torsoLengthPx: number | null = null;
  if (shMidX != null && shMidY != null && hipMidX != null && hipMidY != null) {
    torsoLeanDeg = angleFromVertical(
      { x: hipMidX, y: hipMidY },
      { x: shMidX, y: shMidY }
    );
    torsoLengthPx = Math.hypot(shMidX - hipMidX, shMidY - hipMidY) || null;
  }

  const shS = map2D[`${sideKey}_shoulder`];
  const hipS = map2D[`${sideKey}_hip`];
  const kneeS = map2D[`${sideKey}_knee`];
  const earS = map2D[`${sideKey}_ear`];
  const headPt = seen(earS) ? earS : seen(map2D.nose) ? map2D.nose : undefined;

  const backAngleDeg = seen(shS) && seen(hipS) && headPt ? angle(headPt, shS, hipS) : null;
  const bodyLineDeg = seen(shS) && seen(hipS) && seen(kneeS) ? angle(shS, hipS, kneeS) : null;
  const headDropDeg = headPt && seen(shS) ? angleFromVertical(shS, headPt) : null;

  let kneeValgusRatio: number | null = null;
  if (seen(lk) && seen(rk) && seen(la) && seen(ra)) {
    const ankleW = Math.abs(la.x - ra.x);
    if (ankleW >= 1) kneeValgusRatio = Math.abs(lk.x - rk.x) / ankleW;
  }

  const hipOffsetFromAnkleNorm =
    hipMidX != null && ankleMidX != null && torsoLengthPx
      ? (hipMidX - ankleMidX) / torsoLengthPx
      : null;

  const elbowFlareDeg = { left: null as number | null, right: null as number | null };
  for (const s of ["left", "right"] as const) {
    const shp = map2D[`${s}_shoulder`];
    const hp = map2D[`${s}_hip`];
    const ep = map2D[`${s}_elbow`];
    if (seen(shp) && seen(hp) && seen(ep)) elbowFlareDeg[s] = angle(hp, shp, ep);
  }

  const wristX = {
    left: seen(map2D.left_wrist) ? map2D.left_wrist.x : null,
    right: seen(map2D.right_wrist) ? map2D.right_wrist.x : null,
  };
  const wristY = {
    left: seen(map2D.left_wrist) ? map2D.left_wrist.y : null,
    right: seen(map2D.right_wrist) ? map2D.right_wrist.y : null,
  };

  let shoulderDepthDeltaNorm: number | null = null;
  if (map3D) {
    const ls3 = map3D.left_shoulder;
    const rs3 = map3D.right_shoulder;
    if (seen(ls3, 0) && seen(rs3, 0) && ls3.z != null && rs3.z != null) {
      const width = Math.hypot(ls3.x - rs3.x, ls3.y - rs3.y) || 1;
      shoulderDepthDeltaNorm = Math.abs(ls3.z - rs3.z) / width;
    }
  }

  const heelAboveAnkleNorm = { left: null as number | null, right: null as number | null };
  const toeAboveAnkleNorm = { left: null as number | null, right: null as number | null };
  for (const s of ["left", "right"] as const) {
    const ankle = map2D[`${s}_ankle`];
    const heel = map2D[`${s}_heel`];
    const toe = map2D[`${s}_foot_index`];
    const norm = torsoLengthPx ?? null;
    if (seen(ankle) && seen(heel) && norm) heelAboveAnkleNorm[s] = (ankle.y - heel.y) / norm;
    if (seen(ankle) && seen(toe) && norm) toeAboveAnkleNorm[s] = (ankle.y - toe.y) / norm;
  }

  const earShoulderGapNorm =
    headPt && seen(shS) && torsoLengthPx ? Math.abs(headPt.y - shS.y) / torsoLengthPx : null;

  const kneeAngleDeg = { left: null as number | null, right: null as number | null };
  const elbowAngleDeg = { left: null as number | null, right: null as number | null };
  const hipHeightNorm = { left: null as number | null, right: null as number | null };
  for (const s of ["left", "right"] as const) {
    const hipP = map2D[`${s}_hip`];
    const kneeP = map2D[`${s}_knee`];
    const ankleP = map2D[`${s}_ankle`];
    if (seen(hipP) && seen(kneeP) && seen(ankleP)) kneeAngleDeg[s] = angle(hipP, kneeP, ankleP);

    const shoulderP = map2D[`${s}_shoulder`];
    const elbowP = map2D[`${s}_elbow`];
    const wristP = map2D[`${s}_wrist`];
    if (seen(shoulderP) && seen(elbowP) && seen(wristP)) elbowAngleDeg[s] = angle(shoulderP, elbowP, wristP);

    if (seen(hipP) && shMidY != null && torsoLengthPx) hipHeightNorm[s] = (hipP.y - shMidY) / torsoLengthPx;
  }

  const confSamples = [ls, rs, lh, rh, lk, rk].map(sc).filter((n) => n > 0);
  const confidence = confSamples.length ? confSamples.reduce((a, b) => a + b, 0) / confSamples.length : 0;

  return {
    side,
    orientation: detectOrientation(map2D),
    confidence,
    shoulderTiltDeg,
    hipTiltDeg,
    torsoLeanDeg,
    torsoLengthPx,
    backAngleDeg,
    bodyLineDeg,
    headDropDeg,
    kneeValgusRatio,
    hipOffsetFromAnkleNorm,
    elbowFlareDeg,
    wristX,
    wristY,
    shoulderDepthDeltaNorm,
    heelAboveAnkleNorm,
    toeAboveAnkleNorm,
    earShoulderGapNorm,
    kneeAngleDeg,
    elbowAngleDeg,
    hipHeightNorm,
  };
}
