import type { Dataset } from "../dataset";
import type { BenchmarkResult } from "../benchmark";
import type { VideoReviewTask } from "./types";

/** Not automated video analysis — this app has no such capability, and
 *  building one is out of scope for a measurement framework. This is
 *  workflow tooling: it tells a developer *which* recorded sessions are
 *  worth manually re-watching next, closing the loop that produces more
 *  ground truth (see ground-truth/). */

export function queueUnlabeledSessions(dataset: Dataset): VideoReviewTask[] {
  return dataset.entries
    .filter((entry) => entry.groundTruthId == null)
    .map((entry) => ({
      sessionId: entry.session.meta.sessionId,
      exerciseSlug: entry.session.meta.exerciseSlug,
      reason: "unlabeled" as const,
      flaggedTimestampsMs: entry.session.log
        .filter((l) => l.event === "rep-rejected" && typeof l.t === "number")
        .map((l) => l.t as number),
      status: "pending" as const,
    }));
}

export function queueHighErrorSessions(results: BenchmarkResult[], countErrorThreshold = 2): VideoReviewTask[] {
  return results
    .filter((r) => r.repCounting && r.repCounting.countAbsError >= countErrorThreshold)
    .map((r) => ({
      sessionId: r.sessionId,
      exerciseSlug: r.exerciseSlug,
      reason: "high-count-error" as const,
      flaggedTimestampsMs: [],
      status: "pending" as const,
      reviewerNotes: `Predicted ${r.repCounting!.predictedCount} vs. labeled ${r.repCounting!.groundTruthCount}`,
    }));
}
