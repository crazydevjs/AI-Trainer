// Pull-up / lat pulldown. Neither has any form-rules.ts coverage today
// ("no reliable 2D form fault") — net-new. torsoRotation only fires on the
// 3D (BlazePose) pipeline since it needs depth to see shoulder rotation.

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const pullupProfile: ExerciseFormProfile = {
  expectedModel:
    "Controlled pull with the shoulders staying down and back (not shrugged toward the ears), " +
    "chin clears the bar (or bar reaches the chest on pulldowns), minimal body swing/kipping.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repPhase, repState, progressGap } = ctx;
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
          "Keep your shoulders down and back instead of shrugging up."
        )
      );
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
          "Pull all the way up — chin over the bar, or bar to your chest."
        )
      );
    }

    if (repPhase !== "idle" && m.shoulderDepthDeltaNorm != null) {
      const bands: Bands = { beginner: [0.35, 0.55], advanced: [0.28, 0.45] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "torsoRotation",
          magnitude(m.shoulderDepthDeltaNorm, w, e, "max"),
          m.confidence,
          ["left_shoulder", "right_shoulder"],
          "Avoid twisting or kipping — pull straight up."
        )
      );
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
