import { buildCountOnlyConfusion, buildRepConfusionMatrix } from "../confusion-matrix";
import { computeClassificationMetrics } from "../metrics";
import { mean } from "../statistics";
import { macroAverageClassification } from "../evaluation";
import { compareMetrics, type MetricDirection } from "../comparison";
import { benchmarkRepCounting } from "../benchmark";
import { resolveCandidateRequiredProgress, replayRomCheck } from "./replay";
import type { ValidationResult } from "@/lib/pose/state-machine";
import type { Dataset } from "../dataset";
import type { GroundTruthLabel } from "../ground-truth";
import type { RepCountingBenchmark } from "../benchmark";
import type { ThresholdCandidate, ThresholdTestResult } from "./types";

const THRESHOLD_METRIC_DIRECTIONS: Record<string, MetricDirection> = {
  precision: "higher-better",
  recall: "higher-better",
  f1: "higher-better",
  meanCountAbsError: "lower-better",
};

function toMetricBag(benchmark: RepCountingBenchmark) {
  return {
    precision: benchmark.classification.precision,
    recall: benchmark.classification.recall,
    f1: benchmark.classification.f1,
    meanCountAbsError: benchmark.countAbsError,
  };
}

/** Replays every recorded rep/rep-rejected decision for one session
 *  through the candidate's required-progress threshold, using the real
 *  `buildValidation()` ROM check (see replay.ts) — never rep-counter.ts
 *  itself, never a re-implementation of the acceptance algorithm. Each
 *  entry's candidate threshold is resolved from *that entry's own*
 *  originally-recorded `required` value (see replay.ts for why — `peak`
 *  and `required` must stay on the same progress scale). */
function replaySession(
  entries: { t?: number; event: string; peak?: unknown; required?: unknown; validation?: unknown }[],
  candidate: ThresholdCandidate["config"],
): { acceptedTimestamps: number[]; acceptedCount: number } {
  const acceptedTimestamps: number[] = [];
  for (const entry of entries) {
    if (
      (entry.event !== "rep" && entry.event !== "rep-rejected") ||
      typeof entry.peak !== "number" ||
      typeof entry.required !== "number" ||
      !entry.validation
    ) {
      continue;
    }
    const candidateReqProgress = resolveCandidateRequiredProgress(entry.required, candidate);
    const replayed = replayRomCheck(entry.validation as ValidationResult, entry.peak, candidateReqProgress);
    if (replayed.accepted && typeof entry.t === "number") acceptedTimestamps.push(entry.t);
  }
  return { acceptedTimestamps, acceptedCount: acceptedTimestamps.length };
}

/** Tests a candidate required-progress threshold against every dataset
 *  entry for the candidate's exercise that has ground truth attached —
 *  the automated version of the manual "compare per-rep peak vs required"
 *  tuning workflow. Sessions with no rep/rep-rejected log entries simply
 *  replay to zero accepted reps, same as they would live. */
export function testThresholdCandidate(
  dataset: Dataset,
  groundTruthBySessionId: Map<string, GroundTruthLabel>,
  candidate: ThresholdCandidate,
): ThresholdTestResult {
  const originals: RepCountingBenchmark[] = [];
  const candidates: RepCountingBenchmark[] = [];

  for (const entry of dataset.entries) {
    if (entry.session.meta.poseKey !== candidate.poseKey) continue;
    const groundTruth = groundTruthBySessionId.get(entry.session.meta.sessionId);
    if (!groundTruth) continue;

    originals.push(benchmarkRepCounting(entry.session, groundTruth));

    const { acceptedTimestamps, acceptedCount } = replaySession(entry.session.log, candidate.config);

    const confusionResult = groundTruth.trueRepTimestampsMs?.length
      ? buildRepConfusionMatrix(acceptedTimestamps, groundTruth.trueRepTimestampsMs)
      : buildCountOnlyConfusion(acceptedCount, groundTruth.trueRepCount);
    const confusion = {
      truePositives: confusionResult.truePositives,
      falsePositives: confusionResult.falsePositives,
      falseNegatives: confusionResult.falseNegatives,
    };

    candidates.push({
      mode: confusionResult.mode,
      confusion,
      classification: computeClassificationMetrics(confusion),
      predictedCount: acceptedCount,
      groundTruthCount: groundTruth.trueRepCount,
      countAbsError: Math.abs(acceptedCount - groundTruth.trueRepCount),
    });
  }

  const original: RepCountingBenchmark = {
    mode: originals[0]?.mode ?? "count-only",
    confusion: { truePositives: 0, falsePositives: 0, falseNegatives: 0 },
    classification: macroAverageClassification(originals.map((o) => o.classification)),
    predictedCount: 0,
    groundTruthCount: 0,
    countAbsError: mean(originals.map((o) => o.countAbsError)),
  };
  const candidateAgg: RepCountingBenchmark = {
    mode: candidates[0]?.mode ?? "count-only",
    confusion: { truePositives: 0, falsePositives: 0, falseNegatives: 0 },
    classification: macroAverageClassification(candidates.map((c) => c.classification)),
    predictedCount: 0,
    groundTruthCount: 0,
    countAbsError: mean(candidates.map((c) => c.countAbsError)),
  };

  return {
    candidateLabel: candidate.label,
    poseKey: candidate.poseKey,
    sessionsReplayed: originals.length,
    original,
    candidate: candidateAgg,
    comparison: compareMetrics(toMetricBag(original), toMetricBag(candidateAgg), THRESHOLD_METRIC_DIRECTIONS),
  };
}
