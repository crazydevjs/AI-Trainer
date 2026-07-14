// Barbell/DB row. form-rules.ts has no coverage for "row" ("depth + tempo
// only") — net new. roundedBack reuses the same band philosophy as the
// squat/deadlift back checks since a hinged row position has the same
// spinal-safety concern.

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const barbellRowProfile: ExerciseFormProfile = {
  expectedModel:
    "Hinged, flat-back torso held steady while pulling the elbow back close to the body, " +
    "minimal torso twist or momentum used to move the weight.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repPhase } = ctx;
    const out: (RawIssue | null)[] = [];

    if (repPhase !== "idle" && m.backAngleDeg != null) {
      const bands: Bands = { beginner: [148, 132], advanced: [158, 144] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "roundedBack",
          magnitude(m.backAngleDeg, w, e, "min"),
          m.confidence,
          [`${m.side ?? "left"}_shoulder`, `${m.side ?? "left"}_hip`],
          "Keep your back flat — hinge from the hips, not the spine."
        )
      );
    }

    if (repPhase !== "idle" && m.shoulderDepthDeltaNorm != null) {
      const bands: Bands = { beginner: [0.3, 0.5], advanced: [0.24, 0.4] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "torsoRotation",
          magnitude(m.shoulderDepthDeltaNorm, w, e, "max"),
          m.confidence,
          ["left_shoulder", "right_shoulder"],
          "Keep your torso square — don't twist to pull the weight up."
        )
      );
    }

    if (repPhase !== "idle") {
      for (const s of ["left", "right"] as const) {
        const flare = m.elbowFlareDeg[s];
        if (flare == null) continue;
        const bands: Bands = { beginner: [95, 115], advanced: [88, 105] };
        const [w, e] = bands[mode];
        out.push(
          raw(
            "elbowFlare",
            magnitude(flare, w, e, "max"),
            m.confidence,
            [`${s}_shoulder`, `${s}_elbow`],
            "Pull with your elbow closer to your body, not flared out to the side."
          )
        );
      }
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
