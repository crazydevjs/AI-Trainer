// Public surface of the Performance Intelligence & Persistence Layer —
// import from here, not from individual internal files.

export { runSessionPerformanceEngine, saveWorkoutSnapshot } from "./performance-engine";
export {
  getWorkoutHistory,
  getExerciseHistory,
  getPerformanceTrend,
  getWeaknessTrend,
  getRiskTrend,
  getPersonalBests,
  getAchievements,
} from "./session-service";
export { ACHIEVEMENT_SLUGS } from "./achievements";
// Phase 8 (Personalized Learning Engine) reuses this pure trend classifier
// rather than reimplementing it a third time — see ALGORITHM.md
// "Personalized Learning Engine" → "Reuse note". Additive export only;
// nothing above changes.
export { classifyProgress } from "./progress";
export type {
  AchievementEntry,
  AchievementUpdate,
  ExerciseHistoryEntry,
  PerformanceEngineResult,
  PerformanceEngineSessionInput,
  PerformanceScores,
  PerformanceTrendResult,
  PersonalBestEntry,
  PersonalBestUpdate,
  ProgressTrend,
  RiskTrendEntry,
  SessionFormSummary,
  SessionMovementSummary,
  SessionRiskSummary,
  WeaknessTrendEntry,
  WeaknessUpdate,
  WorkoutHistoryEntry,
} from "./types";
