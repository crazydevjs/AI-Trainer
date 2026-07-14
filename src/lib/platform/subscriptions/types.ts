export type PlanId = "free" | "pro" | "elite";

export interface PlanLimits {
  aiRequestsPerMonth: number;
  workoutSessionsPerMonth: number;
  storageBytes: number;
  uploadsPerMonth: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceUsdPerMonth: number;
  limits: PlanLimits;
}

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface SubscriptionState {
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  currentPeriodEnd: number | null;
}
