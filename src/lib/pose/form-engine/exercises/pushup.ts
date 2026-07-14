// Push-up. form-rules.ts already has a bodyStraight check for this poseKey
// ("Keep your body straight — don't drop your hips") — this profile adds
// elbow-flare and partial-range coverage that check doesn't provide, using
// the same band philosophy for the body-line fault so the two systems agree.

import { magnitude, raw, type Bands } from "../issues";
import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

export const pushupProfile: ExerciseFormProfile = {
  expectedModel:
    "Straight line from shoulders to knees/ankles throughout (no hip sag or piking), elbows " +
    "at roughly 45° from the torso, chest lowers close to the floor each rep.",
  detect(ctx: ExerciseDetectContext): RawIssue[] {
    const { metrics: m, mode, repPhase, repState, progressGap } = ctx;
    const out: (RawIssue | null)[] = [];

    if (repPhase !== "idle" && m.bodyLineDeg != null) {
      const bands: Bands = { beginner: [148, 130], advanced: [158, 144] };
      const [w, e] = bands[mode];
      out.push(
        raw(
          "roundedBack",
          magnitude(m.bodyLineDeg, w, e, "min"),
          m.confidence,
          [`${m.side ?? "left"}_shoulder`, `${m.side ?? "left"}_hip`, `${m.side ?? "left"}_knee`],
          "Keep a straight line from your shoulders to your knees — don't let your hips sag."
        )
      );
    }

    if (repPhase !== "idle") {
      for (const s of ["left", "right"] as const) {
        const flare = m.elbowFlareDeg[s];
        if (flare == null) continue;
        const bands: Bands = { beginner: [75, 92], advanced: [68, 84] };
        const [w, e] = bands[mode];
        out.push(
          raw(
            "elbowFlare",
            magnitude(flare, w, e, "max"),
            m.confidence,
            [`${s}_shoulder`, `${s}_elbow`],
            "Keep your elbows closer to your body, around a 45° angle."
          )
        );
      }
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
          "Lower all the way down until your chest nears the floor."
        )
      );
    }

    return out.filter((r): r is RawIssue => r != null);
  },
};
