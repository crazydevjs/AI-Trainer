export type MetricDirection = "higher-better" | "lower-better";

export interface MetricDelta {
  metric: string;
  before: number;
  after: number;
  delta: number;
  improved: boolean;
  regressed: boolean;
}

export interface ComparisonResult {
  deltas: MetricDelta[];
  improvements: MetricDelta[];
  regressions: MetricDelta[];
  regressionDetected: boolean;
}
