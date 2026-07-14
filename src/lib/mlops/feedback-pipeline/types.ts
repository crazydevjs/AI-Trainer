export type FeedbackType =
  | "false-positive"
  | "false-negative"
  | "incorrect-coaching"
  | "incorrect-recommendation"
  | "incorrect-exercise-detection";

export type FeedbackStatus = "new" | "triaged" | "routed" | "dismissed";

export interface FeedbackEntry {
  id: string;
  userId: string;
  sessionId?: string;
  exerciseSlug?: string;
  type: FeedbackType;
  description: string;
  createdAt: number;
  status: FeedbackStatus;
}
