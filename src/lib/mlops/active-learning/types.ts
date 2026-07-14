export type PriorityReason =
  | "low-confidence"
  | "rare-exercise"
  | "new-movement-pattern"
  | "high-rejection-ratio"
  | "regression-case";

export interface PriorityItem {
  sessionId: string;
  exerciseSlug: string;
  score: number;
  reasons: PriorityReason[];
}
