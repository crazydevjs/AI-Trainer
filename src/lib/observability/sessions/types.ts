import type { Trace } from "../trace";

export interface SessionDebugView {
  workoutSessionId: string;
  workoutSession: {
    id: string;
    exerciseId: string;
    startedAt: Date;
    endedAt: Date | null;
    durationSec: number;
    completionPct: number | null;
    overallScore: number | null;
  } | null;
  /** Present only if a trace was recorded for this session id — traces
   *  are only wired into `POST /api/sessions`/`POST /api/workout-logs`
   *  today (see ALGORITHM.md "Where it runs"). */
  trace: Trace | null;
}
