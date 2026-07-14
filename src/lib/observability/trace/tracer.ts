import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Span, SpanEngine, Trace } from "./types";

const ROOT = path.join(process.cwd(), ".data", "observability", "traces");

const globalForTracer = globalThis as unknown as { observabilityActiveTraces?: Map<string, Trace> };
const activeTraces = globalForTracer.observabilityActiveTraces ?? new Map<string, Trace>();
if (process.env.NODE_ENV !== "production") globalForTracer.observabilityActiveTraces = activeTraces;

export function startTrace(input: { sessionId?: string; userId?: string } = {}): Trace {
  const trace: Trace = { id: randomUUID(), ...input, startedAt: Date.now(), endedAt: null, spans: [] };
  activeTraces.set(trace.id, trace);
  return trace;
}

export function getActiveTrace(traceId: string): Trace | undefined {
  return activeTraces.get(traceId);
}

/** A zero-duration marker — "this engine ran and produced output for this
 *  session," not a timing measurement. See SpanEngine's doc comment for
 *  which engines only ever get presence spans. */
export function addPresenceSpan(traceId: string, engine: SpanEngine, name: string): void {
  const trace = activeTraces.get(traceId);
  if (!trace) return;
  const now = Date.now();
  trace.spans.push({ id: randomUUID(), engine, name, startedAt: now, endedAt: now, durationMs: 0 });
}

/** Wraps a real async call with real start/end timestamps — use only for
 *  engines that actually run in this process (performanceEngine,
 *  personalizationEngine today). */
export async function timeSpan<T>(traceId: string, engine: SpanEngine, name: string, fn: () => Promise<T>): Promise<T> {
  const trace = activeTraces.get(traceId);
  const span: Span = { id: randomUUID(), engine, name, startedAt: Date.now(), endedAt: null, durationMs: null };
  trace?.spans.push(span);
  try {
    return await fn();
  } finally {
    span.endedAt = Date.now();
    span.durationMs = span.endedAt - span.startedAt;
  }
}

export async function endTrace(traceId: string): Promise<Trace | null> {
  const trace = activeTraces.get(traceId);
  if (!trace) return null;
  trace.endedAt = Date.now();
  activeTraces.delete(traceId);

  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${trace.id}.json`), JSON.stringify(trace, null, 2));
  return trace;
}

export async function getTrace(traceId: string): Promise<Trace | null> {
  const active = activeTraces.get(traceId);
  if (active) return active;
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, `${traceId}.json`), "utf-8")) as Trace;
  } catch {
    return null;
  }
}

export async function listRecentTraces(limit = 50): Promise<Trace[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const traces = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    return (traces as Trace[]).sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
  } catch {
    return [];
  }
}
