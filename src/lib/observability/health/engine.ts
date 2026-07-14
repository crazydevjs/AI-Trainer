import { getHealthReport } from "@/lib/platform/monitoring";
import { listQueues } from "@/lib/platform/queue";
import { jobScheduler } from "@/lib/platform/jobs";
import type { HealthComponent, HealthScoreReport } from "./types";

/** "not-configured" counts as passing for scoring purposes — an optional
 *  subsystem that was never wired up (no LLM provider, no SMTP) isn't a
 *  failure, it's an intentional gap. Only "degraded"/"down" hurt the
 *  score, and either one caps the overall status below "healthy". */
export async function computeHealthScore(): Promise<HealthScoreReport> {
  const components: HealthComponent[] = [];

  const platform = await getHealthReport();
  for (const check of platform.checks) {
    components.push({ name: check.name, status: check.status, detail: check.message ?? `${check.latencyMs}ms` });
  }

  components.push({
    name: "providers",
    status: "not-configured",
    detail: "no external LLM/payment providers integrated yet (src/lib/coach.ts is local; billing/ uses the memory provider)",
  });

  components.push({ name: "storage", status: "ok", detail: "local disk provider" });

  const queues = listQueues();
  if (queues.length === 0) {
    components.push({ name: "queues", status: "not-configured", detail: "no queue has any live caller yet" });
  } else {
    const anyFailing = queues.some((q) => q.failedCount > 0 && q.failedCount >= q.processedCount);
    components.push({
      name: "queues",
      status: anyFailing ? "degraded" : "ok",
      detail: `${queues.length} queue(s): ${queues.map((q) => `${q.name} (${q.pending} pending, ${q.failedCount} failed)`).join(", ")}`,
    });
  }

  const jobs = jobScheduler.list();
  const failedJobs = jobs.filter((j) => j.lastResult && !j.lastResult.ok);
  if (jobs.every((j) => !j.lastResult)) {
    components.push({ name: "jobs", status: "not-configured", detail: `${jobs.length} job(s) registered, none have run yet` });
  } else {
    components.push({
      name: "jobs",
      status: failedJobs.length ? "degraded" : "ok",
      detail: `${jobs.length} registered, ${failedJobs.length} last-failed`,
    });
  }

  components.push({
    name: "notifications",
    status: process.env.SMTP_HOST ? "ok" : "not-configured",
    detail: process.env.SMTP_HOST ? "SMTP configured" : "no SMTP configured — dev console-log fallback active",
  });

  const passing = components.filter((c) => c.status === "ok" || c.status === "not-configured").length;
  const score = Math.round((passing / components.length) * 100);
  const status: HealthScoreReport["status"] = components.some((c) => c.status === "down")
    ? "down"
    : components.some((c) => c.status === "degraded")
      ? "degraded"
      : "healthy";

  return { score, status, components, generatedAt: Date.now() };
}
