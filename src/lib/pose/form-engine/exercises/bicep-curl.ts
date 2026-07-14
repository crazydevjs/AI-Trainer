// Bicep curl (standard + hammer). form-rules.ts has no coverage for this
// poseKey ("depth + tempo only") — net new. elbowFlare here catches the
// elbow drifting forward away from the torso (using the shoulder/front delt
// instead of isolating the bicep), the classic curl fault.

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const bicepCurlProfile: ExerciseFormProfile = {
  expectedModel:
    "Elbow stays pinned close to the torso throughout, minimal body swing, curls through the " +
    "full range from straight-arm to full flexion.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repPhase, repState, progressGap } = ctx;
    const out: (RawIssue | null)[] = [];

    if (repPhase !== "idle") {
      for (const s of ["left", "right"] as const) {
        const flare = m.elbowFlareDeg[s];
        if (flare == null) continue;
        const bands: Bands = { beginner: [30, 45], advanced: [22, 35] };
        const [w, e] = bands[mode];
        out.push(
          raw(
            "elbowFlare",
            magnitude(flare, w, e, "max"),
            m.confidence,
            [`${s}_shoulder`, `${s}_elbow`],
            "Keep your elbow pinned to your side — don't let it swing forward."
          )
        );
      }
    }

    if (repPhase !== "idle" && m.torsoLeanDeg != null) {
      const bands: Bands = { beginner: [10, 20], advanced: [7, 15] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "torsoRotation",
          magnitude(m.torsoLeanDeg, w, e, "max"),
          m.confidence,
          [`${m.side ?? "left"}_shoulder`, `${m.side ?? "left"}_hip`],
          "Keep your body still — don't swing to curl the weight up."
        )
      );
    }

    if ((repState === "LOCKOUT" || repState === "REP_COMPLETE") && progressGap != null && progressGap > 0) {
      const bands: Bands = { beginner: [0.08, 0.2], advanced: [0.05, 0.15] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "partialRange",
          magnitude(progressGap, w, e, "max"),
          m.confidence,
          [`${m.side ?? "left"}_elbow`],
          "Curl all the way up through the full range of motion."
        )
      );
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
