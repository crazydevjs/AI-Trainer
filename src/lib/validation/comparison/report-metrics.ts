import type { ExerciseBenchmarkReport } from "../evaluation";
import type { MetricDirection } from "./types";

/** Flattens the metrics worth regression-testing out of an
 *  ExerciseBenchmarkReport, paired with which direction is "better" for
 *  each — the shared vocabulary `compareMetrics()` needs. */
export function reportToMetricBag(report: ExerciseBenchmarkReport): Record<string, number> {
  return {
    precision: report.repCounting?.macroClassification.precision ?? 0,
    recall: report.repCounting?.macroClassification.recall ?? 0,
    f1: report.repCounting?.macroClassification.f1 ?? 0,
    meanCountAbsError: report.repCounting?.meanCountAbsError ?? 0,
    avgFps: report.avgFps,
    p95InferenceMs: report.latency.p95Ms,
  };
}

export const REPORT_METRIC_DIRECTIONS: Record<string, MetricDirection> = {
  precision: "higher-better",
  recall: "higher-better",
  f1: "higher-better",
  meanCountAbsError: "lower-better",
  avgFps: "higher-better",
  p95InferenceMs: "lower-better",
};
