import { classifyExercise, resolveExerciseProfile } from "./exercise-classifier";
import { movementProfileOf } from "./movement-profile";
import type {
  CommonMistake,
  ExerciseProfile,
  MovementProfile,
  ROMProfile,
  RiskProfile,
  TempoProfile,
} from "./types";

/** Public capabilities API — the intended integration surface for the Rep,
 *  Form, Movement, Injury Risk, Performance, and Personalization engines.
 *  Every function is a synchronous, in-memory lookup: no DB calls, no pose
 *  math, safe to call per-frame or per-render. Accepts any of a Prisma
 *  `Exercise.slug`, a pose-layer `poseKey`, or a catalog id. */

export function supportsExercise(key: string | null | undefined): boolean {
  return classifyExercise(key) !== null;
}

export function getExerciseProfile(key: string | null | undefined): ExerciseProfile | null {
  return resolveExerciseProfile(key);
}

export function getMovementProfile(key: string | null | undefined): MovementProfile | null {
  const profile = resolveExerciseProfile(key);
  return profile ? movementProfileOf(profile) : null;
}

export function getROMProfile(key: string | null | undefined): ROMProfile | null {
  return resolveExerciseProfile(key)?.rom ?? null;
}

export function getTempoProfile(key: string | null | undefined): TempoProfile | null {
  return resolveExerciseProfile(key)?.tempo ?? null;
}

export function getCommonMistakes(key: string | null | undefined): CommonMistake[] {
  return resolveExerciseProfile(key)?.commonMistakes ?? [];
}

export function getRiskProfile(key: string | null | undefined): RiskProfile | null {
  return resolveExerciseProfile(key)?.risk ?? null;
}
