import { usageTracker } from "./tracker";
import type { UsageMetric } from "./types";

export type { UsageMetric, UsageSnapshot, QuotaCheck } from "./types";
export { checkQuota } from "./enforcement";

export function recordUsage(userId: string, metric: UsageMetric, amount = 1): void {
  usageTracker.record(userId, metric, amount);
}

export function getUsageSnapshot(userId: string) {
  return usageTracker.snapshot(userId);
}
