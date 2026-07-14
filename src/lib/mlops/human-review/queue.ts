import { saveGroundTruthLabel } from "@/lib/validation/ground-truth";
import { getReviewItem, saveReviewItem, newReviewId } from "./store";
import type { ReviewItem, ReviewStatus } from "./types";

export async function enqueueForReview(input: {
  sessionId: string;
  exerciseSlug: string;
  reason: string;
  confidence: number;
}): Promise<ReviewItem> {
  const item: ReviewItem = { ...input, id: newReviewId(), status: "pending", createdAt: Date.now() };
  await saveReviewItem(item);
  return item;
}

export interface SubmitReviewInput {
  status: ReviewStatus;
  reviewer?: string;
  correctedLabel?: ReviewItem["correctedLabel"];
  notes?: string;
}

/** Submitting a "corrected" review with `trueRepCount` set closes the
 *  loop this whole platform exists for: a human's correction becomes a
 *  real `GroundTruthLabel` (Phase 12), immediately usable by the next
 *  benchmark run — not just a note left in a queue. */
export async function submitReview(id: string, input: SubmitReviewInput): Promise<ReviewItem> {
  const item = await getReviewItem(id);
  if (!item) throw new Error(`Review item "${id}" not found`);

  const updated: ReviewItem = {
    ...item,
    status: input.status,
    reviewer: input.reviewer,
    reviewedAt: Date.now(),
    correctedLabel: input.correctedLabel ?? item.correctedLabel,
    notes: input.notes ?? item.notes,
  };
  await saveReviewItem(updated);

  if (input.status === "corrected" && updated.correctedLabel?.trueRepCount != null) {
    await saveGroundTruthLabel({
      id: `${item.sessionId}-review-${item.id}`,
      sessionId: item.sessionId,
      exerciseSlug: item.exerciseSlug,
      trueRepCount: updated.correctedLabel.trueRepCount,
      trueRepTimestampsMs: updated.correctedLabel.trueRepTimestampsMs,
      expectedRomPct: updated.correctedLabel.expectedRomPct,
      expectedTempoSecPerRep: updated.correctedLabel.expectedTempoSecPerRep,
      expectedFormIssues: updated.correctedLabel.expectedFormIssues,
      notes: updated.correctedLabel.notes ?? `Corrected via human review ${item.id}`,
      labeledBy: input.reviewer,
      labeledAt: Date.now(),
    });
  }

  return updated;
}
