export type RegressionSeverity = "critical" | "warning";
export type BaselineKind = "previousRelease" | "goldenBaseline" | "latestProduction";

export interface RegressionAlert {
  exerciseSlug: string;
  metric: string;
  comparedAgainst: BaselineKind;
  before: number;
  after: number;
  delta: number;
  severity: RegressionSeverity;
}

export interface RegressionSummary {
  alerts: RegressionAlert[];
  hasCriticalRegression: boolean;
  generatedAt: number;
}
