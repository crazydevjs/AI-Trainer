import { computeLatencyMetrics } from "../metrics";
import { mean } from "../statistics";
import type { LabeledSession } from "../dataset";
import type { LatencyMetrics } from "../metrics";

export function benchmarkLatency(session: LabeledSession): { latency: LatencyMetrics; avgFps: number } {
  const samples = session.log.filter((entry) => entry.event === "sample");
  const inferenceMs = samples
    .map((s) => s.inferenceMs)
    .filter((v): v is number => typeof v === "number");
  const fps = samples.map((s) => s.fps).filter((v): v is number => typeof v === "number");

  return { latency: computeLatencyMetrics(inferenceMs), avgFps: mean(fps) };
}
