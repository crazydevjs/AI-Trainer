// Lateral/front raise. form-rules.ts has no coverage for this poseKey —
// net new. shoulderElevation catches shrugging the weight up with the traps
// instead of the delts; torsoRotation catches using body momentum to swing
// the weight up (3D pipeline only, see joint-metrics.ts).

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const lateralRaiseProfile: ExerciseFormProfile = {
  expectedModel:
    "Arms raise to roughly shoulder height using the delts, shoulders stay down (no shrug), " +
    "torso stays still — no swinging or leaning to generate momentum.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repPhase } = ctx;
    const out: (RawIssue | null)[] = [];

    if (repPhase !== "idle" && m.earShoulderGapNorm != null) {
      const bands: Bands = { beginner: [0.22, 0.14], advanced: [0.26, 0.17] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "shoulderElevation",
          magnitude(m.earShoulderGapNorm, w, e, "min"),
          m.confidence,
          [`${m.side ?? "left"}_shoulder`, `${m.side ?? "left"}_ear`],
          "Lead with your arms, not your shoulders — don't shrug."
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
          "Keep your torso still — avoid swinging the weight up."
        )
      );
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
