export interface RepMatch {
  predictedIndex: number | null;
  groundTruthIndex: number | null;
  /** Only set when both sides matched — how far apart the timestamps were. */
  deltaMs?: number;
}

export interface RepConfusionResult {
  matches: RepMatch[];
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  mode: "timestamp-matched" | "count-only";
}
