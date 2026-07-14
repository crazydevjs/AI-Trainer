import type { TelemetryEvent, TimingSample, TrackedError } from "./types";

const MAX_SAMPLES = 500;

/** In-memory ring-buffer telemetry recorder — enough to drive the
 *  Developer Platform dashboard and to export a debug snapshot, without a
 *  real telemetry backend wired up yet. Swapping in one (Datadog,
 *  OpenTelemetry, etc.) means changing `track`/`time`/`recordError` to
 *  also forward to that backend — the call sites (API routes, engines'
 *  future integrations) don't change. */
class Telemetry {
  private events: TelemetryEvent[] = [];
  private timings: TimingSample[] = [];
  private errors: TrackedError[] = [];
  private counters = new Map<string, number>();

  track(name: string, properties?: TelemetryEvent["properties"]): void {
    this.push(this.events, { name, timestamp: Date.now(), properties });
    this.counters.set(name, (this.counters.get(name) ?? 0) + 1);
  }

  recordTiming(name: string, durationMs: number): void {
    this.push(this.timings, { name, durationMs, timestamp: Date.now() });
  }

  /** Wraps an async function, recording its duration under `name`
   *  regardless of success/failure — use for engine execution time, AI
   *  Coach latency, API latency, etc. */
  async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.recordTiming(name, performance.now() - start);
    }
  }

  recordError(error: unknown, context?: TrackedError["context"]): void {
    const err = error instanceof Error ? error : new Error(String(error));
    this.push(this.errors, {
      message: err.message,
      stack: err.stack,
      context,
      timestamp: Date.now(),
    });
  }

  private push<T>(buffer: T[], item: T) {
    buffer.push(item);
    if (buffer.length > MAX_SAMPLES) buffer.shift();
  }

  snapshot() {
    return {
      recentEvents: this.events.slice(-50),
      recentTimings: this.timings.slice(-50),
      recentErrors: this.errors.slice(-20),
      counters: Object.fromEntries(this.counters),
    };
  }
}

const globalForTelemetry = globalThis as unknown as { platformTelemetry?: Telemetry };

export const telemetry = globalForTelemetry.platformTelemetry ?? new Telemetry();
if (process.env.NODE_ENV !== "production") globalForTelemetry.platformTelemetry = telemetry;
