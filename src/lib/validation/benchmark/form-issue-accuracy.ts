import { computeClassificationMetrics } from "../metrics";
import type { LabeledSession } from "../dataset";
import type { GroundTruthLabel } from "../ground-truth";
import type { FormIssueBenchmark } from "./types";

/** Set-based comparison, not a per-frame one — asks "did the Form Engine
 *  flag the same issue *types* a human reviewer expected over the whole
 *  session," not "at the exact same rep." Per-rep issue timing accuracy
 *  would need ground truth at rep granularity, which `GroundTruthLabel`
 *  doesn't carry today (see Known limitations). */
export function benchmarkFormIssues(
  session: LabeledSession,
  groundTruth: GroundTruthLabel,
): FormIssueBenchmark | null {
  if (!groundTruth.expectedFormIssues || !session.formAnalysis) return null;

  const predicted = new Set(session.formAnalysis.topIssues as string[]);
  const expected = new Set(groundTruth.expectedFormIssues);

  let truePositives = 0;
  let falsePositives = 0;
  for (const issue of predicted) {
    if (expected.has(issue)) truePositives++;
    else falsePositives++;
  }
  const falseNegatives = [...expected].filter((issue) => !predicted.has(issue)).length;

  const confusion = { truePositives, falsePositives, falseNegatives };
  return {
    confusion,
    classification: computeClassificationMetrics(confusion),
    predictedIssues: [...predicted],
    expectedIssues: [...expected],
  };
}
