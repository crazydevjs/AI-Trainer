import { listFeedback, routeFeedbackToReview } from "@/lib/mlops/feedback-pipeline";

/** Processes every "new" feedback entry, routing the ones tied to a
 *  session into the human-review queue — "route them into datasets," per
 *  Phase 13's brief. Feedback with no `sessionId` (e.g. general coaching
 *  complaints) is left as "new" for manual triage; there's nothing to
 *  attach a review item to. */
async function main() {
  const pending = await listFeedback("new");
  if (pending.length === 0) {
    console.log("No new feedback to sync.");
    return;
  }

  let routed = 0;
  for (const entry of pending) {
    if (!entry.sessionId) continue;
    const item = await routeFeedbackToReview(entry.id);
    if (item) {
      routed++;
      console.log(`Routed feedback ${entry.id} (${entry.type}) → review item ${item.id}`);
    }
  }

  console.log(`\nSynced ${pending.length} feedback entr${pending.length === 1 ? "y" : "ies"}, ${routed} routed to review.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
