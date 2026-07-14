import { computeLatencyMetrics, type LatencyMetrics } from "@/lib/validation/metrics";
import { telemetry } from "@/lib/platform/telemetry";
import { listRecentTraces } from "../trace";
import type { LatencyDashboard } from "./types";

/** Aggregates *real* timing where it's actually recorded (Phase 11's
 *  telemetry ring buffer for API-level timing, this phase's trace spans
 *  for the two server-side engines, local storage provider timing) and
 *  is explicit about the categories this app has no instrumentation for
 *  at all — never fabricates a number for those. */
export async function getLatencyDashboard(): Promise<LatencyDashboard> {
  const snapshot = telemetry.snapshot();
  const apiTimings = snapshot.recentTimings.filter((t) => t.name.startsWith("api.")).map((t) => t.durationMs);
  const storageTimings = snapshot.recentTimings.filter((t) => t.name.startsWith("storage.")).map((t) => t.durationMs);

  const traces = await listRecentTraces(200);
  const engineDurations = new Map<string, number[]>();
  for (const trace of traces) {
    for (const span of trace.spans) {
      if (span.durationMs == null) continue;
      const list = engineDurations.get(span.engine) ?? [];
      list.push(span.durationMs);
      engineDurations.set(span.engine, list);
    }
  }
  const engines: Record<string, LatencyMetrics> = {};
  for (const [engine, durations] of engineDurations) engines[engine] = computeLatencyMetrics(durations);

  return {
    api: apiTimings.length ? computeLatencyMetrics(apiTimings) : null,
    apiNote: apiTimings.length ? `${apiTimings.length} recent request(s)` : "no timed requests recorded yet",
    engines,
    database: null,
    databaseNote: "not separately instrumented — API latency is an upper bound including DB time",
    queue: null,
    queueNote: "src/lib/platform/queue/ has no live callers yet — nothing to measure",
    storage: storageTimings.length ? computeLatencyMetrics(storageTimings) : null,
    storageNote: storageTimings.length ? `${storageTimings.length} recent local-disk op(s)` : "no timed storage operations recorded yet",
    streaming: null,
    streamingNote: "no streaming (SSE/WebSocket) endpoints exist in this app",
    coach: null,
    coachNote: "src/lib/coach.ts runs fully client-side with no network round-trip",
  };
}
