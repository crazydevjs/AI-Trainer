import { runBenchmark } from "../benchmark";
import { computeLatencyMetrics } from "../metrics";
import { mean } from "../statistics";
import { macroAverageClassification } from "./aggregate";
import type { Dataset } from "../dataset";
import type { GroundTruthLabel } from "../ground-truth";
import type { ExerciseBenchmarkReport } from "./types";

const WORST_SESSIONS_LIMIT = 5;

/** Groups a dataset's entries by exercise and produces one report per
 *  exercise — "each exercise receives its own benchmark report," per
 *  Phase 12's brief. `groundTruthBySessionId` is looked up once by the
 *  caller (`listGroundTruthLabels()` → a Map) rather than re-read per
 *  entry, since this function is meant to run over hundreds of sessions
 *  offline, not per-frame. */
export function evaluateDataset(
  dataset: Dataset,
  groundTruthBySessionId: Map<string, GroundTruthLabel>,
): ExerciseBenchmarkReport[] {
  const byExercise = new Map<string, typeof dataset.entries>();
  for (const entry of dataset.entries) {
    const key = entry.session.meta.exerciseSlug;
    const group = byExercise.get(key) ?? [];
    group.push(entry);
    byExercise.set(key, group);
  }

  const reports: ExerciseBenchmarkReport[] = [];
  for (const [exerciseSlug, entries] of byExercise) {
    const results = entries.map((entry) =>
      runBenchmark(entry, groundTruthBySessionId.get(entry.session.meta.sessionId) ?? null),
    );

    const labeled = results.filter((r) => r.repCounting != null);
    const inferenceSamples = entries.flatMap((e) =>
      e.session.log
        .filter((l) => l.event === "sample" && typeof l.inferenceMs === "number")
        .map((l) => l.inferenceMs as number),
    );

    reports.push({
      exerciseSlug,
      poseKey: entries[0]?.session.meta.poseKey ?? null,
      datasetName: dataset.manifest.name,
      datasetVersion: dataset.manifest.version,
      sessionCount: entries.length,
      labeledSessionCount: labeled.length,
      repCounting: labeled.length
        ? {
            macroClassification: macroAverageClassification(labeled.map((r) => r.repCounting!.classification)),
            meanCountAbsError: mean(labeled.map((r) => r.repCounting!.countAbsError)),
          }
        : null,
      formIssues: results.some((r) => r.formIssues)
        ? {
            macroClassification: macroAverageClassification(
              results.filter((r) => r.formIssues).map((r) => r.formIssues!.classification),
            ),
          }
        : null,
      latency: computeLatencyMetrics(inferenceSamples),
      avgFps: mean(results.map((r) => r.avgFps).filter((v) => v > 0)),
      worstSessions: labeled
        .map((r) => ({ sessionId: r.sessionId, countAbsError: r.repCounting!.countAbsError }))
        .sort((a, b) => b.countAbsError - a.countAbsError)
        .slice(0, WORST_SESSIONS_LIMIT),
      generatedAt: Date.now(),
    });
  }

  return reports;
}
