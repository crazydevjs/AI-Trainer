export interface HistogramSummary {
  count: number;
  min: number;
  max: number;
  avg: number;
  p95: number;
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, HistogramSummary>;
}
