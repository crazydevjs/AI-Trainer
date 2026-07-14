import { ALL_EXERCISE_IDS, EXERCISE_CATALOG } from "./exercise-catalog";
import type { ExerciseId, ExerciseProfile } from "./types";

/** Built once at module load — alias lookup is an O(1) map read, never a
 *  per-frame scan. Aliases cover Prisma `Exercise.slug` values and
 *  pose-layer `poseKey` values so either identifier resolves. */
const ALIAS_TO_ID: ReadonlyMap<string, ExerciseId> = (() => {
  const map = new Map<string, ExerciseId>();
  for (const id of ALL_EXERCISE_IDS) {
    for (const alias of EXERCISE_CATALOG[id].aliases) {
      map.set(alias, id);
    }
  }
  return map;
})();

/** Resolves any known identifier — a Prisma `Exercise.slug`, a pose-layer
 *  `poseKey`, or the catalog's own id — to a canonical ExerciseId. Returns
 *  null for exercises not yet in the catalog; there is no generic fallback
 *  profile, so callers should degrade gracefully (same convention as
 *  getExerciseConfig/getFormProfile in the pose layer). */
export function classifyExercise(key: string | null | undefined): ExerciseId | null {
  if (!key) return null;
  return ALIAS_TO_ID.get(key.toLowerCase().trim()) ?? null;
}

export function resolveExerciseProfile(key: string | null | undefined): ExerciseProfile | null {
  const id = classifyExercise(key);
  return id ? EXERCISE_CATALOG[id] : null;
}
