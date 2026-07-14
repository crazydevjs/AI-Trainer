import { buildCountOnlyConfusion, buildRepConfusionMatrix } from "../confusion-matrix";
import { computeClassificationMetrics } from "../metrics";
import type { LabeledSession } from "../dataset";
import type { GroundTruthLabel } from "../ground-truth";
import type { RepCountingBenchmark } from "./types";

function extractPredictedRepTimestamps(session: LabeledSession): number[] {
  return session.log
    .filter((entry) => entry.event === "rep" && typeof entry.t === "number")
    .map((entry) => entry.t as number);
}

function extractPredictedCount(session: LabeledSession): number {
  return session.summary.repsCounted ?? session.summary.totalReps ?? 0;
}

export function benchmarkRepCounting(
  session: LabeledSession,
  groundTruth: GroundTruthLabel,
): RepCountingBenchmark {
  const predictedCount = extractPredictedCount(session);
  const groundTruthCount = groundTruth.trueRepCount;

  const confusionResult = groundTruth.trueRepTimestampsMs?.length
    ? buildRepConfusionMatrix(extractPredictedRepTimestamps(session), groundTruth.trueRepTimestampsMs)
    : buildCountOnlyConfusion(predictedCount, groundTruthCount);

  const confusion = {
    truePositives: confusionResult.truePositives,
    falsePositives: confusionResult.falsePositives,
    falseNegatives: confusionResult.falseNegatives,
  };

  return {
    mode: confusionResult.mode,
    confusion,
    classification: computeClassificationMetrics(confusion),
    predictedCount,
    groundTruthCount,
    countAbsError: Math.abs(predictedCount - groundTruthCount),
  };
}
