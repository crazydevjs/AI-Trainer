// Per-exercise Form Analysis profile registry, keyed by poseKey — same shape
// as exercises.ts's CONFIGS/getExerciseConfig. A poseKey with no dedicated
// profile still gets full generic (joint/symmetry/balance) analysis from
// issues.ts; it just skips the exercise-specific checks in exercises/*.ts.

import { squatProfile } from "./exercises/squat";
import { benchPressProfile } from "./exercises/bench-press";
import { deadliftProfile } from "./exercises/deadlift";
import { pushupProfile } from "./exercises/pushup";
import { pullupProfile } from "./exercises/pullup";
import { shoulderPressProfile } from "./exercises/shoulder-press";
import { barbellRowProfile } from "./exercises/barbell-row";
import { lateralRaiseProfile } from "./exercises/lateral-raise";
import { bicepCurlProfile } from "./exercises/bicep-curl";
import type { ExerciseFormProfile } from "./types";

const PROFILES: Record<string, ExerciseFormProfile> = {
  squat: squatProfile,
  "front-squat": squatProfile,
  lunge: squatProfile,
  "bench-press": benchPressProfile,
  deadlift: deadliftProfile,
  rdl: deadliftProfile,
  "push-up": pushupProfile,
  "pull-up": pullupProfile,
  "pull-down": pullupProfile,
  "shoulder-press": shoulderPressProfile,
  row: barbellRowProfile,
  "lateral-raise": lateralRaiseProfile,
  "front-raise": lateralRaiseProfile,
  curl: bicepCurlProfile,
  "hammer-curl": bicepCurlProfile,
};

export function getFormProfile(poseKey?: string | null): ExerciseFormProfile | null {
  if (poseKey && PROFILES[poseKey]) return PROFILES[poseKey];
  return null;
}
