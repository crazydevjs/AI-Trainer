import { enqueueForReview, type ReviewItem } from "../human-review";
import { getFeedback, saveFeedback } from "./store";

/** Turns a feedback entry into a human-review queue item — the "route
 *  them into datasets" half of Phase 13's brief. Only feedback tied to a
 *  specific session can be routed (nothing to review without one); other
 *  feedback stays "new" for manual triage. */
export async function routeFeedbackToReview(feedbackId: string): Promise<ReviewItem | null> {
  const feedback = await getFeedback(feedbackId);
  if (!feedback || !feedback.sessionId) return null;

  const reviewItem = await enqueueForReview({
    sessionId: feedback.sessionId,
    exerciseSlug: feedback.exerciseSlug ?? "unknown",
    reason: `User feedback: ${feedback.type} — ${feedback.description}`,
    confidence: 1,
  });

  await saveFeedback({ ...feedback, status: "routed" });
  return reviewItem;
}
