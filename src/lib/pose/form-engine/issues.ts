// Exercise-agnostic technique-fault detectors. These run for every exercise
// (including ones with no ExerciseFormProfile at all — see registry.ts),
// covering the joint/symmetry/balance issues that aren't specific to any one
// lift's movement pattern. Exercise-specific faults (rounded back at the
// bottom of a squat, bar-path deviation on a bench press, etc.) live in
// exercises/*.ts instead — see DEVELOPER_GUIDE.md "Adding a new exercise".
//
// All thresholds below are conservative first-pass defaults. Per the
// established Phases 1-3 tuning workflow, they are not adjusted without
// real gym-tested JSON debug exports — see CHANGELOG.md.

import type { JointMetrics } from "./joint-metrics";
import type { Mode, RawIssue } from "./types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** magnitude 0..1: 0 right at the warn line, 1 at (or past) the error line. */
function magnitude(value: number, warn: number, error: number, dir: "min" | "max"): number {
  if (dir === "min") {
    if (value >= warn) return 0;
    return clamp01((warn - value) / Math.max(1e-6, warn - error));
  }
  if (value <= warn) return 0;
  return clamp01((value - warn) / Math.max(1e-6, error - warn));
}

type Bands = Record<Mode, [number, number]>;

function raw(
  id: RawIssue["id"],
  mag: number,
  confidence: number,
  affectedJoints: string[],
  correction: string
): RawIssue | null {
  return mag > 0 ? { id, magnitude: mag, confidence, affectedJoints, correction } : null;
}

export interface SwayStats {
  hipSwayStdDev: number | null; // rolling stddev of hipOffsetFromAnkleNorm
  leanStdDev: number | null; // rolling stddev of torsoLeanDeg
}

export interface FootBaseline {
  left: number | null; // rolling min of heel/toeAboveAnkleNorm — "foot flat" reference
  right: number | null;
}

export function detectGenericIssues(
  m: JointMetrics,
  sway: SwayStats,
  heelBaseline: FootBaseline,
  toeBaseline: FootBaseline,
  mode: Mode
): RawIssue[] {
  const out: (RawIssue | null)[] = [];

  // Uneven shoulders / hips — visible mainly from the front; the front-view
  // tilt line should stay close to horizontal.
  const shoulderBands: Bands = { beginner: [6, 12], advanced: [4, 9] };
  if (m.shoulderTiltDeg != null) {
    const [w, e] = shoulderBands[mode];
    out.push(
      raw(
        "unevenShoulders",
        magnitude(Math.abs(m.shoulderTiltDeg), w, e, "max"),
        m.confidence,
        ["left_shoulder", "right_shoulder"],
        "Keep your shoulders level."
      )
    );
  }
  const hipBands: Bands = { beginner: [6, 12], advanced: [4, 9] };
  if (m.hipTiltDeg != null) {
    const [w, e] = hipBands[mode];
    out.push(
      raw(
        "unevenHips",
        magnitude(Math.abs(m.hipTiltDeg), w, e, "max"),
        m.confidence,
        ["left_hip", "right_hip"],
        "Level your hips — avoid shifting to one side."
      )
    );
  }

  // Knee tracking — same band philosophy as form-rules.ts's kneesOut check
  // (valgus only trustworthy from the front).
  if (m.kneeValgusRatio != null && m.orientation === "front") {
    const valgusBands: Bands = { beginner: [0.55, 0.42], advanced: [0.68, 0.54] };
    const [wv, ev] = valgusBands[mode];
    out.push(
      raw(
        "kneeValgus",
        magnitude(m.kneeValgusRatio, wv, ev, "min"),
        m.confidence,
        ["left_knee", "right_knee"],
        "Push your knees outward, in line with your toes."
      )
    );
    const varusBands: Bands = { beginner: [1.15, 1.35], advanced: [1.1, 1.28] };
    const [wr, er] = varusBands[mode];
    out.push(
      raw(
        "kneeVarus",
        magnitude(m.kneeValgusRatio, wr, er, "max"),
        m.confidence,
        ["left_knee", "right_knee"],
        "Let your knees track naturally over your feet."
      )
    );
  }

  // Head/neck position.
  if (m.headDropDeg != null) {
    const bands: Bands = { beginner: [28, 42], advanced: [22, 36] };
    const [w, e] = bands[mode];
    out.push(
      raw(
        "headLookingDown",
        magnitude(m.headDropDeg, w, e, "max"),
        m.confidence,
        ["nose", `${m.side ?? "left"}_ear`],
        "Keep your eyes forward, chin level."
      )
    );
  }
  if (m.headDropDeg != null && m.torsoLeanDeg != null) {
    const neckVsTorso = Math.abs(m.headDropDeg - m.torsoLeanDeg);
    const bands: Bands = { beginner: [22, 35], advanced: [18, 30] };
    const [w, e] = bands[mode];
    out.push(
      raw(
        "neckMisalignment",
        magnitude(neckVsTorso, w, e, "max"),
        m.confidence,
        [`${m.side ?? "left"}_ear`, `${m.side ?? "left"}_shoulder`],
        "Keep your neck in line with your spine."
      )
    );
  }

  // Balance / stability — from rolling sway sampled by the engine, not this
  // (stateless) frame's metrics alone.
  if (sway.hipSwayStdDev != null) {
    const bands: Bands = { beginner: [0.045, 0.08], advanced: [0.035, 0.065] };
    const [w, e] = bands[mode];
    out.push(
      raw(
        "lossOfBalance",
        magnitude(sway.hipSwayStdDev, w, e, "max"),
        m.confidence,
        ["left_hip", "right_hip"],
        "Find a stable base — avoid swaying side to side."
      )
    );
  }
  if (sway.leanStdDev != null) {
    const bands: Bands = { beginner: [5, 9], advanced: [3.5, 7] };
    const [w, e] = bands[mode];
    out.push(
      raw(
        "coreInstability",
        magnitude(sway.leanStdDev, w, e, "max"),
        m.confidence,
        ["left_shoulder", "left_hip"],
        "Brace your core to keep your torso steady."
      )
    );
  }

  // Heel/toe lift — only meaningful with a foot-keypoint baseline (BlazePose
  // 3D pipeline) and a calibrated normalization; see DEVELOPER_GUIDE.md
  // "Known limitations" for why this is skipped on the 2D-only pipeline.
  const footBands: Bands = { beginner: [0.02, 0.045], advanced: [0.015, 0.035] };
  for (const s of ["left", "right"] as const) {
    const heelVal = m.heelAboveAnkleNorm[s];
    const heelBase = heelBaseline[s];
    if (heelVal != null && heelBase != null) {
      const [w, e] = footBands[mode];
      out.push(
        raw(
          "heelLift",
          magnitude(heelVal - heelBase, w, e, "max"),
          m.confidence,
          [`${s}_heel`, `${s}_ankle`],
          "Keep your heels planted on the floor."
        )
      );
    }
    const toeVal = m.toeAboveAnkleNorm[s];
    const toeBase = toeBaseline[s];
    if (toeVal != null && toeBase != null) {
      const [w, e] = footBands[mode];
      out.push(
        raw(
          "toeLift",
          magnitude(toeVal - toeBase, w, e, "max"),
          m.confidence,
          [`${s}_foot_index`, `${s}_ankle`],
          "Keep your whole foot in contact with the floor."
        )
      );
    }
  }

  return out.filter((r): r is RawIssue => r != null);
}

export { magnitude, clamp01, raw };
export type { Bands };
