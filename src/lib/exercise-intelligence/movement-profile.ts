import type { ExerciseProfile, MovementProfile } from "./types";

/** Derives the "Movement Profile" view (ROM + velocity/tempo envelope +
 *  lockout/bottom-position control) from a full ExerciseProfile, so this
 *  data is authored once in exercise-catalog.ts rather than duplicated. */
export function movementProfileOf(profile: ExerciseProfile): MovementProfile {
  return {
    movementPattern: profile.movementPattern,
    rom: profile.rom,
    tempo: profile.tempo,
    requiresLockout: profile.requiresLockout,
    bottomPositionControlled: profile.bottomPositionControlled,
    controlRequirement: profile.tempo.controlRequirement,
  };
}
