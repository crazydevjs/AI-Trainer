// Bench press (and by extension incline/DB press sharing the "bench-press"
// poseKey). form-rules.ts has no checks for this lift today ("depth + tempo
// only") — this profile is net-new coverage, not a duplicate.

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const benchPressProfile: ExerciseFormProfile = {
  expectedModel:
    "Bar lowers to the chest under control with elbows at a moderate angle from the torso " +
    "(not fully flared, not pinned to the sides), then presses back to full lockout in a " +
    "straight vertical path.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repPhase, repState, progressGap, wristDriftNorm } = ctx;
    const out: (RawIssue | null)[] = [];

    if (repPhase !== "idle") {
      for (const s of ["left", "right"] as const) {
        const flare = m.elbowFlareDeg[s];
        if (flare == null) continue;
        const flareBands: Bands = { beginner: [72, 88], advanced: [66, 80] };
        const [fw, fe] = flareBands[mode];
        out.push(
          raw(
            "elbowFlare",
            magnitude(flare, fw, fe, "max"),
            m.confidence,
            [`${s}_shoulder`, `${s}_elbow`],
            "Don't flare your elbows out — keep them at roughly a 45-75° angle."
          )
        );
        const narrowBands: Bands = { beginner: [28, 15], advanced: [32, 20] };
        const [nw, ne] = narrowBands[mode];
        out.push(
          raw(
            "elbowsTooNarrow",
            magnitude(flare, nw, ne, "min"),
            m.confidence,
            [`${s}_shoulder`, `${s}_elbow`],
            "Let your elbows open up slightly — don't tuck them all the way in."
          )
        );
      }
    }

    if ((repState === "LOCKOUT" || repState === "REP_COMPLETE") && progressGap != null && progressGap > 0) {
      const bands: Bands = { beginner: [0.08, 0.2], advanced: [0.05, 0.15] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "incompleteLockout",
          magnitude(progressGap, w, e, "max"),
          m.confidence,
          [`${m.side ?? "left"}_elbow`, `${m.side ?? "left"}_wrist`],
          "Press all the way to full arm extension at the top."
        )
      );
    }

    if (repPhase !== "idle") {
      const drift = [wristDriftNorm.left, wristDriftNorm.right].filter(
        (v): v is number => v != null
      );
      if (drift.length) {
        const worst = Math.max(...drift);
        const bands: Bands = { beginner: [0.18, 0.32], advanced: [0.14, 0.26] };
        const [w, e] = bands[mode];
        out.push(
          raw(
            "barPathDeviation",
            magnitude(worst, w, e, "max"),
            m.confidence,
            ["left_wrist", "right_wrist"],
            "Press in a straight vertical path over your chest."
          )
        );
      }
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
