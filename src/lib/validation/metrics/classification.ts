import type { ClassificationMetrics, ConfusionCounts } from "./types";

export function computeClassificationMetrics(counts: ConfusionCounts): ClassificationMetrics {
  const { truePositives: tp, falsePositives: fp, falseNegatives: fn, trueNegatives: tn } = counts;

  const precision = tp + fp > 0 ? tp / (tp + fp) : tp === 0 ? 1 : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : tp === 0 ? 1 : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = tn != null ? (tp + tn) / (tp + fp + fn + tn) : null;

  return { precision, recall, f1, accuracy };
}
