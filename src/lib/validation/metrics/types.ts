export interface ConfusionCounts {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  /** Only meaningful for closed-set classification (e.g. "was this exact
   *  issue id present"); left undefined for open-ended rep matching where
   *  "true negative" isn't a well-defined concept. */
  trueNegatives?: number;
}

export interface ClassificationMetrics {
  precision: number;
  recall: number;
  f1: number;
  /** Only populated when trueNegatives is known. */
  accuracy: number | null;
}

export interface LatencyMetrics {
  sampleCount: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}
