// Public surface of the Injury Risk Engine — import from here, not from
// individual internal files.

export { InjuryRiskEngine, type RiskAnalysisInput } from "./engine";
export type {
  RecommendationHistoryEntry,
  RecommendedAction,
  RiskCategory,
  RiskFactor,
  RiskLevel,
  RiskRecommendation,
  RiskSnapshot,
  RiskTimelineEntry,
  SessionRiskSummary,
} from "./types";
