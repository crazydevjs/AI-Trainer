import type { ComparisonResult } from "../comparison";
import type { RepCountingBenchmark } from "../benchmark";

export interface ThresholdCandidateConfig {
  /** Absolute required-progress fraction (0..1) to test instead of
   *  whatever each session originally recorded. Takes precedence over
   *  `requiredProgressDeltaPct` if both are set. */
  requiredProgressOverride?: number;
  /** Relative adjustment applied to each session's own originally-
   *  recorded required-progress fraction (e.g. -0.1 = require 10% less
   *  depth). Useful when a dataset mixes sessions/exercises that didn't
   *  all originally require the same fraction. */
  requiredProgressDeltaPct?: number;
}

export interface ThresholdCandidate {
  label: string;
  poseKey: string;
  config: ThresholdCandidateConfig;
}

export interface ThresholdTestResult {
  candidateLabel: string;
  poseKey: string;
  sessionsReplayed: number;
  original: RepCountingBenchmark;
  candidate: RepCountingBenchmark;
  comparison: ComparisonResult;
}
