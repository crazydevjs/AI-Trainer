import { mean } from "@/lib/validation/statistics";
import { supportsExercise } from "@/lib/exercise-intelligence";
import type { Dataset } from "@/lib/validation/dataset";
import type { PriorityItem, PriorityReason } from "./types";

const WEIGHTS: Record<PriorityReason, number> = {
  "regression-case": 4,
  "new-movement-pattern": 3,
  "low-confidence": 3,
  "rare-exercise": 2,
  "high-rejection-ratio": 2,
};

export interface PrioritizeOptions {
  /** Sessions already implicated in a regression report's "worst
   *  sessions" list — the strongest possible signal that a session needs
   *  human eyes, so it's weighted highest. */
  regressionSessionIds?: Set<string>;
  rareExerciseThreshold?: number;
  lowConfidenceThreshold?: number;
  highRejectionRatioThreshold?: number;
  limit?: number;
}

/** Prioritizes *unlabeled* sessions for a human to label next — every
 *  signal here is something the app already recorded (confidence
 *  samples, rep-rejection counts, exercise frequency within the dataset,
 *  Exercise Intelligence catalog coverage), never a guess. "High
 *  disagreement" from the brief is approximated as a high rejected/total
 *  rep ratio — the closest available proxy without ground truth to
 *  measure true prediction disagreement against. */
export function prioritizeForLabeling(dataset: Dataset, options: PrioritizeOptions = {}): PriorityItem[] {
  const rareThreshold = options.rareExerciseThreshold ?? 2;
  const lowConfidenceThreshold = options.lowConfidenceThreshold ?? 70;
  const highRejectionRatioThreshold = options.highRejectionRatioThreshold ?? 0.3;

  const exerciseCounts: Record<string, number> = {};
  for (const entry of dataset.entries) {
    const slug = entry.session.meta.exerciseSlug;
    exerciseCounts[slug] = (exerciseCounts[slug] ?? 0) + 1;
  }

  const items: PriorityItem[] = [];
  for (const entry of dataset.entries) {
    if (entry.groundTruthId != null) continue; // already labeled

    const session = entry.session;
    const reasons: PriorityReason[] = [];

    if (options.regressionSessionIds?.has(session.meta.sessionId)) reasons.push("regression-case");

    if (!supportsExercise(session.meta.poseKey ?? session.meta.exerciseSlug)) reasons.push("new-movement-pattern");

    if (exerciseCounts[session.meta.exerciseSlug] <= rareThreshold) reasons.push("rare-exercise");

    const confidenceSamples = session.log
      .filter((l) => l.event === "sample" && typeof l.confidence === "number")
      .map((l) => l.confidence as number);
    if (confidenceSamples.length && mean(confidenceSamples) < lowConfidenceThreshold) reasons.push("low-confidence");

    const rejected = session.summary.repsRejected ?? 0;
    const counted = session.summary.repsCounted ?? session.summary.totalReps ?? 0;
    const total = rejected + counted;
    if (total > 0 && rejected / total > highRejectionRatioThreshold) reasons.push("high-rejection-ratio");

    if (reasons.length === 0) continue;

    items.push({
      sessionId: session.meta.sessionId,
      exerciseSlug: session.meta.exerciseSlug,
      score: reasons.reduce((sum, r) => sum + WEIGHTS[r], 0),
      reasons,
    });
  }

  items.sort((a, b) => b.score - a.score);
  return options.limit ? items.slice(0, options.limit) : items;
}
