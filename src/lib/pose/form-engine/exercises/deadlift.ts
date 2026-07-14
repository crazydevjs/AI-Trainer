// Deadlift / RDL (hip-hinge pattern). roundedBack reuses the same band
// philosophy as form-rules.ts's backStraight check.
//
// Known limitation: a single monocular 2D frame can't reliably tell forward
// lean apart from backward hyperextension at lockout without a facing/mirror
// calibration — both show up as "torso not vertical at lockout" here. We bias
// the label toward "overextendedBack" since leaning back to finish the pull
// is the far more common lockout fault. See DEVELOPER_GUIDE.md.

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const deadliftProfile: ExerciseFormProfile = {
  expectedModel:
    "Neutral, flat spine throughout the pull, hips and shoulders rise together, bar/hands " +
    "travel close to the body, torso finishes vertical (not hyperextended) at lockout.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repPhase, repState } = ctx;
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
          "Keep a flat back — brace your core before you pull."
        )
      );
    }

    if ((repState === "LOCKOUT" || repState === "REP_COMPLETE") && m.torsoLeanDeg != null) {
      const bands: Bands = { beginner: [16, 28], advanced: [12, 22] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "overextendedBack",
          magnitude(m.torsoLeanDeg, w, e, "max"),
          m.confidence,
          [`${m.side ?? "left"}_shoulder`, `${m.side ?? "left"}_hip`],
          "Finish standing tall — don't lean back past vertical to lock out."
        )
      );
    }

    if (repPhase !== "idle" && m.hipOffsetFromAnkleNorm != null) {
      const bands: Bands = { beginner: [0.12, 0.22], advanced: [0.1, 0.18] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "weightShift",
          magnitude(Math.abs(m.hipOffsetFromAnkleNorm), w, e, "max"),
          m.confidence,
          ["left_hip", "right_hip"],
          "Keep the weight over the middle of your feet."
        )
      );
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
