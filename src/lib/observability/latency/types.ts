import type { LatencyMetrics } from "@/lib/validation/metrics";

/** `null` (with a note in the accompanying `*Note` field) means "not
 *  instrumented yet" — never a fabricated zero. */
export interface LatencyDashboard {
  api: LatencyMetrics | null;
  apiNote: string;
  engines: Record<string, LatencyMetrics>;
  database: LatencyMetrics | null;
  databaseNote: string;
  queue: LatencyMetrics | null;
  queueNote: string;
  storage: LatencyMetrics | null;
  storageNote: string;
  streaming: LatencyMetrics | null;
  streamingNote: string;
  coach: LatencyMetrics | null;
  coachNote: string;
}
