export type { MetricDirection, MetricDelta, ComparisonResult } from "./types";
export { compareMetrics } from "./compare";
export { reportToMetricBag, REPORT_METRIC_DIRECTIONS } from "./report-metrics";

import { compareMetrics } from "./compare";
import { reportToMetricBag, REPORT_METRIC_DIRECTIONS } from "./report-metrics";
import type { ExerciseBenchmarkReport } from "../evaluation";

export function compareExerciseReports(before: ExerciseBenchmarkReport, after: ExerciseBenchmarkReport) {
  return compareMetrics(reportToMetricBag(before), reportToMetricBag(after), REPORT_METRIC_DIRECTIONS);
}
