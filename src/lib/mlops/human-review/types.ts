import type { GroundTruthLabel } from "@/lib/validation/ground-truth";

export type ReviewStatus = "pending" | "approved" | "corrected" | "rejected";

export interface ReviewItem {
  id: string;
  sessionId: string;
  exerciseSlug: string;
  reason: string;
  /** 0..1 — how uncertain the *flagging* signal was (e.g. low pose
   *  confidence, high disagreement), not a rep-level confidence value. */
  confidence: number;
  status: ReviewStatus;
  reviewer?: string;
  reviewedAt?: number;
  correctedLabel?: Partial<GroundTruthLabel>;
  notes?: string;
  createdAt: number;
}
