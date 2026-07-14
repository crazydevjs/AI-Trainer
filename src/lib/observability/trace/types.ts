/** The engines a trace can carry a span for. The four pose-layer engines
 *  (rep/form/movement/risk) run entirely client-side per frame — their
 *  *timing* is never transmitted to the server, only their final output
 *  (already true as of Phase 7). Spans for those four are "presence"
 *  markers (durationMs stays null) confirming the engine ran and
 *  produced output for this session, not measured server-side latency.
 *  performanceEngine/personalizationEngine spans are real, timed spans —
 *  those two run server-side, in the same request. */
export type SpanEngine =
  | "repEngine"
  | "formEngine"
  | "movementEngine"
  | "riskEngine"
  | "performanceEngine"
  | "personalizationEngine"
  | "coach";

export interface Span {
  id: string;
  engine: SpanEngine;
  name: string;
  startedAt: number;
  endedAt: number | null;
  /** null for presence-only spans (see SpanEngine doc) — never fabricated. */
  durationMs: number | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface Trace {
  id: string;
  sessionId?: string;
  userId?: string;
  startedAt: number;
  endedAt: number | null;
  spans: Span[];
}
