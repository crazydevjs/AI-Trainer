// Exercise Intelligence — public barrel.
//
// Read-only exercise metadata (biomechanics, ROM/tempo envelopes, common
// mistakes, risk sensitivities) that any downstream engine can consume
// additively. Loads once, no DB access, no per-frame pose computation, and
// never replaces existing engine scores — see SYSTEM_ARCHITECTURE.md.

export * from "./types";
export { EXERCISE_CATALOG, ALL_EXERCISE_IDS } from "./exercise-catalog";
export { classifyExercise, resolveExerciseProfile } from "./exercise-classifier";
export {
  supportsExercise,
  getExerciseProfile,
  getMovementProfile,
  getROMProfile,
  getTempoProfile,
  getCommonMistakes,
  getRiskProfile,
} from "./exercise-capabilities";
export { getExerciseIntelligenceSnapshot, type ExerciseIntelligenceSnapshot } from "./exercise-engine";
