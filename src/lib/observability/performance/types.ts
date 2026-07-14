/** Client-side pose-pipeline performance (FPS, inference latency, device
 *  tier mix) — the counterpart to `latency/`'s server-side view. Sourced
 *  from Phase 12 dataset debug logs (the only place this data is
 *  recorded today); `latency/` covers server/API timing. */
export interface ClientPerformanceSnapshot {
  datasetName: string | null;
  datasetVersion: number | null;
  sessionsAnalyzed: number;
  avgFps: number | null;
  avgInferenceMs: number | null;
  deviceTierDistribution: Record<string, number>;
}
