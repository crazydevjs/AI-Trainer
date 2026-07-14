// 7-session / 30-day / 90-day trend + rolling average + improvement/
// regression %, upserted into TrendHistory (a cached "current state" rollup
// — the historical log itself lives in PerformanceSnapshot, queried here).

import { getRecentSnapshots, upsertTrendHistory } from "./performance-store";
import { classifyProgress } from "./progress";

const DAY_MS = 24 * 60 * 60 * 1000;
const avg = (a: number[]) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : null);

function pctChange(values: number[]): number | null {
  if (values.length < 2) return null;
  const third = Math.max(1, Math.floor(values.length / 3));
  const early = avg(values.slice(0, third)) ?? 0;
  const late = avg(values.slice(-third)) ?? 0;
  if (early <= 0) return null;
  return Math.round(((late - early) / early) * 1000) / 10;
}

export async function updateTrendHistory(userId: string, exerciseId: string | null): Promise<void> {
  const since90 = new Date(Date.now() - 90 * DAY_MS);
  const rows = await getRecentSnapshots(userId, exerciseId, since90, 500);
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const allScores = rows.map((r) => r.overallScore);
  const last7Scores = allScores.slice(-7);
  const scores30 = rows.filter((r) => r.createdAt >= since30).map((r) => r.overallScore);

  const change = pctChange(allScores);
  const rollingAvgScore = avg(allScores.slice(-10));

  await upsertTrendHistory({
    userId,
    exerciseId,
    sevenSessionTrend: classifyProgress(last7Scores),
    thirtyDayTrend: classifyProgress(scores30),
    ninetyDayTrend: classifyProgress(allScores),
    rollingAvgScore: rollingAvgScore != null ? Math.round(rollingAvgScore) : null,
    improvementPct: change != null && change > 0 ? change : null,
    regressionPct: change != null && change < 0 ? Math.abs(change) : null,
    sessionsAnalyzed: rows.length,
  });
}
