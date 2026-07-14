import type { PlanDefinition, PlanId } from "./types";

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** First-pass plan limits — placeholders until real pricing/usage data
 *  exists, same conservative-first-pass stance as every engine threshold
 *  in this codebase. Changing a limit is editing this table only. */
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceUsdPerMonth: 0,
    limits: { aiRequestsPerMonth: 100, workoutSessionsPerMonth: 12, storageBytes: 100 * MB, uploadsPerMonth: 10 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsdPerMonth: 15,
    limits: { aiRequestsPerMonth: 2000, workoutSessionsPerMonth: 60, storageBytes: 5 * GB, uploadsPerMonth: 100 },
  },
  elite: {
    id: "elite",
    name: "Elite",
    priceUsdPerMonth: 30,
    limits: { aiRequestsPerMonth: 10_000, workoutSessionsPerMonth: 1000, storageBytes: 25 * GB, uploadsPerMonth: 500 },
  },
};

export function getPlanLimits(planId: PlanId) {
  return PLANS[planId].limits;
}
