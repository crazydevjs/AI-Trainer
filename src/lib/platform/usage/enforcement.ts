import { getSubscriptionPlanLimits } from "../subscriptions";
import type { PlanLimits } from "../subscriptions";
import { usageTracker } from "./tracker";
import type { QuotaCheck, UsageMetric } from "./types";

/** Only metrics with a matching plan-limit field are actually capped;
 *  `apiCalls`/`streamingTokens` aren't plan-differentiated yet (no field
 *  for them on `PlanLimits`), so they report as unlimited until product
 *  decides on real limits — tracked either way, so the data exists once
 *  that decision is made. */
const METRIC_LIMIT_KEY: Partial<Record<UsageMetric, keyof PlanLimits>> = {
  aiRequests: "aiRequestsPerMonth",
  workoutSessions: "workoutSessionsPerMonth",
  uploads: "uploadsPerMonth",
  storageBytes: "storageBytes",
};

export async function checkQuota(userId: string, metric: UsageMetric): Promise<QuotaCheck> {
  const limits = await getSubscriptionPlanLimits(userId);
  const limitKey = METRIC_LIMIT_KEY[metric];
  const limit = limitKey ? limits[limitKey] : Infinity;
  const used = usageTracker.get(userId, metric);
  return { allowed: used < limit, remaining: Math.max(0, limit - used), limit };
}
