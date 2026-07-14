import type { ClassificationMetrics, LatencyMetrics } from "../metrics";

export interface ExerciseBenchmarkReport {
  exerciseSlug: string;
  poseKey: string | null;
  datasetName: string;
  datasetVersion: number;
  sessionCount: number;
  labeledSessionCount: number;
  repCounting: {
    /** Average of each labeled session's own precision/recall/F1 — every
     *  session counts equally regardless of how many reps it contains
     *  (macro, not micro, averaging). */
    macroClassification: ClassificationMetrics;
    meanCountAbsError: number;
  } | null;
  formIssues: { macroClassification: ClassificationMetrics } | null;
  latency: LatencyMetrics;
  avgFps: number;
  worstSessions: { sessionId: string; countAbsError: number }[];
  generatedAt: number;
}
