import type { ExerciseProfile } from "./types";

/** Defines a catalog entry, normalizing aliases (lowercased, trimmed,
 *  deduped, and always including the exercise's own id) so catalog authors
 *  don't have to repeat that bookkeeping for every new exercise. */
export function defineExercise(
  profile: Omit<ExerciseProfile, "aliases"> & { aliases: string[] },
): ExerciseProfile {
  const normalized = new Set(
    [profile.id, ...profile.aliases].map((a) => a.toLowerCase().trim()),
  );
  return { ...profile, aliases: [...normalized] };
}
