import type { HistogramSummary, MetricsSnapshot } from "./types";

const MAX_SAMPLES_PER_HISTOGRAM = 200;

/** Minimal Prometheus-shaped metrics registry (counters, gauges,
 *  histograms) kept in memory. Sufficient to drive the Developer Platform
 *  dashboard's "API Metrics" panel; a real deployment would additionally
 *  expose `/metrics` in Prometheus text format from this same registry —
 *  intentionally not built here since nothing scrapes it yet (see Known
 *  limitations). */
class MetricsRegistry {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histogramSamples = new Map<string, number[]>();

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  observe(name: string, value: number): void {
    const samples = this.histogramSamples.get(name) ?? [];
    samples.push(value);
    if (samples.length > MAX_SAMPLES_PER_HISTOGRAM) samples.shift();
    this.histogramSamples.set(name, samples);
  }

  private summarize(samples: number[]): HistogramSummary {
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return {
      count: sorted.length,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      avg: sorted.length ? sum / sorted.length : 0,
      p95: sorted[p95Index] ?? 0,
    };
  }

  snapshot(): MetricsSnapshot {
    const histograms: Record<string, HistogramSummary> = {};
    for (const [name, samples] of this.histogramSamples) {
      histograms[name] = this.summarize(samples);
    }
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms,
    };
  }
}

const globalForMetrics = globalThis as unknown as { platformMetrics?: MetricsRegistry };

export const metrics = globalForMetrics.platformMetrics ?? new MetricsRegistry();
if (process.env.NODE_ENV !== "production") globalForMetrics.platformMetrics = metrics;
