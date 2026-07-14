import type { ClassificationMetrics, ConfusionCounts, LatencyMetrics } from "../metrics";

export interface RepCountingBenchmark {
  mode: "timestamp-matched" | "count-only";
  confusion: ConfusionCounts;
  classification: ClassificationMetrics;
  predictedCount: number;
  groundTruthCount: number;
  countAbsError: number;
}

export interface FormIssueBenchmark {
  confusion: ConfusionCounts;
  classification: ClassificationMetrics;
  predictedIssues: string[];
  expectedIssues: string[];
}

export interface BenchmarkResult {
  entryId: string;
  sessionId: string;
  exerciseSlug: string;
  poseKey: string | null;
  /** null when the entry has no attached ground truth — nothing to score
   *  rep-counting accuracy against yet. */
  repCounting: RepCountingBenchmark | null;
  /** null when neither ground truth nor a Form Engine analysis exists for
   *  this session. */
  formIssues: FormIssueBenchmark | null;
  latency: LatencyMetrics;
  avgFps: number;
  generatedAt: number;
}
