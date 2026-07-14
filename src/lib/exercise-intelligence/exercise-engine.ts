import { getExerciseProfile } from "./exercise-capabilities";
import { movementProfileOf } from "./movement-profile";
import type { ExerciseProfile, MovementProfile } from "./types";

export interface ExerciseIntelligenceSnapshot {
  profile: ExerciseProfile;
  movement: MovementProfile;
}

/** Convenience facade over exercise-capabilities.ts for consumers (the
 *  Developer HUD, future engine integrations) that want the full metadata
 *  bundle for one lookup key in a single call. Resolve once per exercise
 *  change — not per frame — and hold onto the result. */
export function getExerciseIntelligenceSnapshot(
  key: string | null | undefined,
): ExerciseIntelligenceSnapshot | null {
  const profile = getExerciseProfile(key);
  if (!profile) return null;
  return { profile, movement: movementProfileOf(profile) };
}
