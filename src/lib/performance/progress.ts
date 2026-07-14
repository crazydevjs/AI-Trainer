// Progress Engine — classifies a score history into one of six buckets.
// Deliberately independent of the runtime engines: this operates on
// PerformanceSnapshot rows across days/weeks, not in-memory per-frame
// data, so it does not import movement-engine/trend.ts's classifyTrend()
// despite the conceptual similarity — see ALGORITHM.md "Independence from
// the runtime engines".

import { getRecentSnapshots } from "./performance-store";
import type { ProgressTrend } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_POINTS = 3;
const RAPID_IMPROVEMENT_PCT = 25;
const IMPROVING_PCT = 8;
const DECLINING_PCT = -8;
const REGRESSION_PCT = -20;
const PLATEAU_MIN_POINTS = 6;
const PLATEAU_STD_DEV = 3;

export function classifyProgress(values: number[]): ProgressTrend {
  if (values.length < MIN_POINTS) return "insufficientData";

  const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const third = Math.max(1, Math.floor(values.length / 3));
  const early = avg(values.slice(0, third));
  const late = avg(values.slice(-third));
  const pct = early > 0 ? ((late - early) / early) * 100 : 0;

  if (pct > RAPID_IMPROVEMENT_PCT) return "rapidImprovement";
  if (pct > IMPROVING_PCT) return "improving";
  if (pct < REGRESSION_PCT) return "regression";
  if (pct < DECLINING_PCT) return "declining";

  if (values.length >= PLATEAU_MIN_POINTS) {
    const mean = avg(values);
    const stdDev = Math.sqrt(values.reduce((s, n) => s + (n - mean) ** 2, 0) / values.length);
    if (stdDev < PLATEAU_STD_DEV) return "plateau";
  }
  return "stable";
}

export async function computeProgress(userId: string, exerciseId: string | null): Promise<ProgressTrend> {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const snapshots = await getRecentSnapshots(userId, exerciseId, since);
  return classifyProgress(snapshots.map((s) => s.overallScore));
}
