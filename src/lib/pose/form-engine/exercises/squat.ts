// Squat family (squat, front-squat, lunge). Bands for roundedBack reuse the
// same philosophy as form-rules.ts's backStraight check (side view, min-dir);
// forwardLean/hipShift are new, conservative first-pass bands — see
// issues.ts header note on the tuning workflow.

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const squatProfile: ExerciseFormProfile = {
  expectedModel:
    "Hip/knee/ankle flexion to at least parallel depth, torso hinges forward moderately " +
    "but stays braced, weight centered over mid-foot, knees track over the toes.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repPhase } = ctx;
    const out: (RawIssue | null)[] = [];

    if (repPhase === "down" && m.backAngleDeg != null) {
      const bands: Bands = { beginner: [148, 132], advanced: [158, 144] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "roundedBack",
          magnitude(m.backAngleDeg, w, e, "min"),
          m.confidence,
          [`${m.side ?? "left"}_shoulder`, `${m.side ?? "left"}_hip`],
          "Keep your chest up and your back straight as you descend."
        )
      );
    }

    if (repPhase === "down" && m.torsoLeanDeg != null) {
      const bands: Bands = { beginner: [42, 58], advanced: [36, 50] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "forwardLean",
          magnitude(m.torsoLeanDeg, w, e, "max"),
          m.confidence,
          [`${m.side ?? "left"}_shoulder`, `${m.side ?? "left"}_hip`],
          "Sit back into the squat instead of leaning forward."
        )
      );
    }

    if (m.hipOffsetFromAnkleNorm != null && m.orientation === "front") {
      const bands: Bands = { beginner: [0.1, 0.2], advanced: [0.08, 0.16] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "hipShift",
          magnitude(Math.abs(m.hipOffsetFromAnkleNorm), w, e, "max"),
          m.confidence,
          ["left_hip", "right_hip"],
          "Keep your hips centered over your feet."
        )
      );
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
