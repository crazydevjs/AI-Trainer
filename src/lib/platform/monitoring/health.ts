import { prisma } from "@/lib/prisma";
import { sharedMemoryCache } from "../cache/memory-cache";
import type { HealthCheckResult, HealthReport, HealthStatus } from "./types";

async function timed(name: string, fn: () => Promise<void>): Promise<HealthCheckResult> {
  const start = performance.now();
  try {
    await fn();
    return { name, status: "ok", latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    return {
      name,
      status: "down",
      latencyMs: Math.round(performance.now() - start),
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkDatabase(): Promise<HealthCheckResult> {
  return timed("database", async () => {
    await prisma.$queryRaw`SELECT 1`;
  });
}

function checkCache(): Promise<HealthCheckResult> {
  return timed("cache", async () => {
    const key = "__health_check__";
    await sharedMemoryCache.set(key, "ok", 5);
    const value = await sharedMemoryCache.get<string>(key);
    if (value !== "ok") throw new Error("cache round-trip failed");
  });
}

function overallStatus(checks: HealthCheckResult[]): HealthStatus {
  if (checks.some((c) => c.status === "down")) return "down";
  if (checks.some((c) => c.status === "degraded")) return "degraded";
  return "ok";
}

/** Aggregate health report — backs `/api/health`. Readiness/liveness
 *  endpoints use a subset of this (see the API routes). */
export async function getHealthReport(): Promise<HealthReport> {
  const checks = await Promise.all([checkDatabase(), checkCache()]);
  return { status: overallStatus(checks), checks, timestamp: Date.now() };
}

/** Liveness: is the process itself responsive? Deliberately checks
 *  nothing external (a dead DB shouldn't make the orchestrator kill and
 *  restart a perfectly healthy process). */
export function getLiveness(): HealthReport {
  return { status: "ok", checks: [{ name: "process", status: "ok", latencyMs: 0 }], timestamp: Date.now() };
}

/** Readiness: can this instance actually serve traffic right now? */
export async function getReadiness(): Promise<HealthReport> {
  const check = await checkDatabase();
  return { status: check.status, checks: [check], timestamp: Date.now() };
}
