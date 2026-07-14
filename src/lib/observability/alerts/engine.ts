import { listReleases } from "@/lib/mlops/release-manager";
import { computeHealthScore } from "../health";
import { getLatencyDashboard } from "../latency";
import { computeCostReport } from "../cost";
import { getTotalCrashCount } from "../crash-analysis";
import { recordAlert } from "./store";
import type { Alert } from "./types";

/** Placeholder thresholds — first-pass, not yet validated against real
 *  production traffic (same "conservative first pass, tune from real
 *  data" stance as every other threshold in this codebase). */
const LATENCY_P95_THRESHOLD_MS = 500;
const COST_MONTHLY_THRESHOLD_USD = 50;
const CRASH_SPIKE_THRESHOLD_PER_DAY = 5;

/** Evaluates all seven alert conditions against real current state and
 *  persists any that trip. Safe to call repeatedly/idempotently isn't
 *  guaranteed (each trip records a new Alert) — callers (the CLI, a
 *  future cron) are expected to call this on a schedule, not per
 *  request. */
export async function checkAlertConditions(): Promise<Alert[]> {
  const fired: Alert[] = [];

  const releases = await listReleases();
  const latestRegressed = releases.find((r) => r.regressionSummary?.hasCriticalRegression);
  if (latestRegressed) {
    fired.push(
      await recordAlert("regression", "critical", `Release "${latestRegressed.name}" has a critical regression`),
    );
  }

  const latency = await getLatencyDashboard();
  if (latency.api && latency.api.p95Ms > LATENCY_P95_THRESHOLD_MS) {
    fired.push(
      await recordAlert("latency", "warning", `API p95 latency ${latency.api.p95Ms.toFixed(0)}ms exceeds ${LATENCY_P95_THRESHOLD_MS}ms`),
    );
  }

  const cost = await computeCostReport();
  if (cost.monthlyProjection > COST_MONTHLY_THRESHOLD_USD) {
    fired.push(
      await recordAlert("cost-spike", "warning", `Projected monthly cost $${cost.monthlyProjection.toFixed(2)} exceeds $${COST_MONTHLY_THRESHOLD_USD}`),
    );
  }

  // Can't actually fire today — health/ always reports "providers" as
  // "not-configured" since no external LLM/payment provider is wired up.
  // Kept real (not stubbed out) so it starts working the moment one is.
  const health = await computeHealthScore();
  const providers = health.components.find((c) => c.name === "providers");
  if (providers?.status === "down") {
    fired.push(await recordAlert("provider-outage", "critical", `Provider outage: ${providers.detail}`));
  }
  const queueComponent = health.components.find((c) => c.name === "queues");
  if (queueComponent?.status === "degraded" || queueComponent?.status === "down") {
    fired.push(await recordAlert("queue-failure", "warning", `Queue issue: ${queueComponent.detail}`));
  }
  const storageComponent = health.components.find((c) => c.name === "storage");
  if (storageComponent?.status === "degraded" || storageComponent?.status === "down") {
    fired.push(await recordAlert("storage-failure", "critical", `Storage issue: ${storageComponent.detail}`));
  }

  const crashCount = await getTotalCrashCount(1);
  if (crashCount > CRASH_SPIKE_THRESHOLD_PER_DAY) {
    fired.push(await recordAlert("crash-spike", "critical", `${crashCount} client crashes reported in the last 24h`));
  }

  return fired;
}
