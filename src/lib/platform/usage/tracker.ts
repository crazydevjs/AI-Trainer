import type { UsageMetric, UsageSnapshot } from "./types";

const METRICS: UsageMetric[] = [
  "aiRequests",
  "workoutSessions",
  "uploads",
  "storageBytes",
  "apiCalls",
  "streamingTokens",
];

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

/** In-memory monthly usage counters, keyed by user+month+metric. Resets
 *  naturally each calendar month since the key includes the month string;
 *  resets on every process restart too, since nothing persists it yet —
 *  a Prisma-backed store is the natural follow-up (see Known limitations). */
class UsageTracker {
  private counters = new Map<string, number>();

  private key(userId: string, metric: UsageMetric, month: string): string {
    return `${userId}:${month}:${metric}`;
  }

  record(userId: string, metric: UsageMetric, amount = 1, month = currentMonth()): void {
    const key = this.key(userId, metric, month);
    this.counters.set(key, (this.counters.get(key) ?? 0) + amount);
  }

  get(userId: string, metric: UsageMetric, month = currentMonth()): number {
    return this.counters.get(this.key(userId, metric, month)) ?? 0;
  }

  snapshot(userId: string, month = currentMonth()): UsageSnapshot {
    const usage = {} as Record<UsageMetric, number>;
    for (const metric of METRICS) usage[metric] = this.get(userId, metric, month);
    return { userId, month, usage };
  }
}

const globalForUsage = globalThis as unknown as { platformUsageTracker?: UsageTracker };

export const usageTracker = globalForUsage.platformUsageTracker ?? new UsageTracker();
if (process.env.NODE_ENV !== "production") globalForUsage.platformUsageTracker = usageTracker;
