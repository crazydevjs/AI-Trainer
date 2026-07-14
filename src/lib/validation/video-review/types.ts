export interface VideoReviewTask {
  sessionId: string;
  exerciseSlug: string;
  reason: "unlabeled" | "high-count-error";
  flaggedTimestampsMs: number[];
  status: "pending" | "reviewed";
  reviewerNotes?: string;
}
