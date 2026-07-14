import type { LogLevel } from "./types";

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

type Meta = Record<string, unknown>;

function write(level: LogLevel, message: string, meta?: Meta) {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;
  const line = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...meta });
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  sink(line);
}

/** Structured JSON logger — every line is a single parseable object, ready
 *  for a real log aggregator (Datadog, CloudWatch, etc.) to ingest without
 *  a reformat. Level filtered by `LOG_LEVEL` (default "info"). */
export const logger = {
  debug: (message: string, meta?: Meta) => write("debug", message, meta),
  info: (message: string, meta?: Meta) => write("info", message, meta),
  warn: (message: string, meta?: Meta) => write("warn", message, meta),
  error: (message: string, meta?: Meta) => write("error", message, meta),
};

/** Wraps an async DB/query call, logging a warning if it exceeds
 *  `thresholdMs` — opt-in at whichever call site wants it, never forced
 *  onto an existing file. */
export async function logSlowQuery<T>(
  label: string,
  fn: () => Promise<T>,
  thresholdMs = 200,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = performance.now() - start;
    if (durationMs > thresholdMs) {
      logger.warn("slow query", { label, durationMs: Math.round(durationMs) });
    }
  }
}
