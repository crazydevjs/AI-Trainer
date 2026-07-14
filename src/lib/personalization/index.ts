// Public surface of the Personalized Learning Engine — import from here,
// not from individual internal files.

export { runPersonalizationEngine, getLearningSummary } from "./engine";
export { getUserProfile } from "./user-profile";
export { getAdaptiveThresholds } from "./adaptive-thresholds";
export { getPrediction } from "./progress-predictor";
export { getGoalProfile, setGoalProfile } from "./goal-engine";
export { getRecommendationHistory } from "./recommendation-learning";
export { getCoachingPreference, setCoachingPreference } from "./coach-personality";

export type {
  AdaptiveThresholdResult,
  CoachingStyle,
  ExperienceLevel,
  FatigueProfile,
  GoalProfileResult,
  LearnedWeaknessResult,
  LearningSummaryResult,
  PersonalizationEngineInput,
  PersonalizationEngineResult,
  ProgressPredictionResult,
  ProgressTrend,
  RecommendationEffectivenessResult,
  TrainingGoal,
  UserLearningProfileResult,
  WeaknessClassification,
} from "./types";
