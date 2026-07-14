import { mean, percentile } from "../statistics";
import type { LatencyMetrics } from "./types";

export function computeLatencyMetrics(samplesMs: number[]): LatencyMetrics {
  if (samplesMs.length === 0) {
    return { sampleCount: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0 };
  }
  return {
    sampleCount: samplesMs.length,
    avgMs: mean(samplesMs),
    p50Ms: percentile(samplesMs, 50),
    p95Ms: percentile(samplesMs, 95),
    p99Ms: percentile(samplesMs, 99),
    maxMs: Math.max(...samplesMs),
  };
}
