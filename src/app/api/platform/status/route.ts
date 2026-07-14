import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getHealthReport } from "@/lib/platform/monitoring";
import { cacheStats } from "@/lib/platform/cache";
import { listQueues } from "@/lib/platform/queue";
import { jobScheduler } from "@/lib/platform/jobs";
import { featureFlagStore, isEnabled } from "@/lib/platform/feature-flags";
import { rateLimiterSnapshot } from "@/lib/platform/rate-limiter";
import { metrics } from "@/lib/platform/metrics";
import { telemetry } from "@/lib/platform/telemetry";
import { getSubscription, getSubscriptionPlanLimits } from "@/lib/platform/subscriptions";
import { getUsageSnapshot } from "@/lib/platform/usage";
import { auditLog } from "@/lib/platform/audit";

/** Aggregates every platform module's status into one payload for the
 *  Developer dashboard's Platform page — every module is a synchronous or
 *  cheap in-memory read except the health check (DB round-trip), so this
 *  route is safe to poll occasionally, not something to call per-frame. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const { session } = guard;

  const [health, subscriptionState, planLimits] = await Promise.all([
    getHealthReport(),
    getSubscription(session.sub),
    getSubscriptionPlanLimits(session.sub),
  ]);
  const flags = featureFlagStore.listRules().map((rule) => ({
    ...rule,
    enabledForYou: isEnabled(rule.key, { userId: session.sub }),
  }));

  return NextResponse.json({
    health,
    cache: cacheStats(),
    queues: listQueues(),
    jobs: jobScheduler.list(),
    flags,
    rateLimiter: rateLimiterSnapshot(),
    metrics: metrics.snapshot(),
    telemetry: telemetry.snapshot(),
    subscription: { state: subscriptionState, limits: planLimits },
    usage: getUsageSnapshot(session.sub),
    recentAudit: auditLog.list(10),
  });
}
