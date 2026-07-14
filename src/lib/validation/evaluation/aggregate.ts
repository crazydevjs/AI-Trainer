import { mean } from "../statistics";
import type { ClassificationMetrics } from "../metrics";

export function macroAverageClassification(all: ClassificationMetrics[]): ClassificationMetrics {
  if (all.length === 0) return { precision: 0, recall: 0, f1: 0, accuracy: null };
  const accuracies = all.map((m) => m.accuracy).filter((a): a is number => a != null);
  return {
    precision: mean(all.map((m) => m.precision)),
    recall: mean(all.map((m) => m.recall)),
    f1: mean(all.map((m) => m.f1)),
    accuracy: accuracies.length ? mean(accuracies) : null,
  };
}
