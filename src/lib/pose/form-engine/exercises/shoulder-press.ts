// Overhead/shoulder press. form-rules.ts already checks chestUp ("Keep your
// torso tall") for this poseKey — overextendedBack adds a lockout-specific
// check (leaning back to help finish the press) that check doesn't cover.

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const shoulderPressProfile: ExerciseFormProfile = {
  expectedModel:
    "Torso stays upright throughout, bar/dumbbells press in a straight vertical path to full " +
    "overhead lockout without leaning back to drive the weight up.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repState, progressGap } = ctx;
    const out: (RawIssue | null)[] = [];

    if ((repState === "LOCKOUT" || repState === "REP_COMPLETE") && m.torsoLeanDeg != null) {
      const bands: Bands = { beginner: [14, 24], advanced: [10, 18] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "overextendedBack",
          magnitude(m.torsoLeanDeg, w, e, "max"),
          m.confidence,
          [`${m.side ?? "left"}_shoulder`, `${m.side ?? "left"}_hip`],
          "Keep your torso upright — don't lean back to press the weight up."
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
          "Press all the way to full overhead lockout."
        )
      );
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
