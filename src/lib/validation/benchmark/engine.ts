import { benchmarkRepCounting } from "./rep-accuracy";
import { benchmarkFormIssues } from "./form-issue-accuracy";
import { benchmarkLatency } from "./latency";
import type { DatasetEntry } from "../dataset";
import type { GroundTruthLabel } from "../ground-truth";
import type { BenchmarkResult } from "./types";

/** Runs every available benchmark against one dataset entry. Never
 *  invokes a live pose model or the browser-only rep-counting pipeline —
 *  everything here reads data an existing session already recorded
 *  (`session.log`, `session.formAnalysis`) and, where ground truth exists,
 *  compares it. This is measurement, not re-inference. */
export function runBenchmark(entry: DatasetEntry, groundTruth: GroundTruthLabel | null): BenchmarkResult {
  const { session } = entry;
  const { latency, avgFps } = benchmarkLatency(session);

  return {
    entryId: entry.id,
    sessionId: session.meta.sessionId,
    exerciseSlug: session.meta.exerciseSlug,
    poseKey: session.meta.poseKey,
    repCounting: groundTruth ? benchmarkRepCounting(session, groundTruth) : null,
    formIssues: groundTruth ? benchmarkFormIssues(session, groundTruth) : null,
    latency,
    avgFps,
    generatedAt: Date.now(),
  };
}
