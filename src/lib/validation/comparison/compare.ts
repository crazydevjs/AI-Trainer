import type { ComparisonResult, MetricDelta, MetricDirection } from "./types";

/** Generic before/after metric comparator — used both for exercise report
 *  vs. exercise report (regression detection between two dataset runs)
 *  and original vs. candidate threshold (threshold-testing/). `tolerance`
 *  is the minimum relative change (fraction of `before`, or absolute for
 *  a `before` of 0) before a delta counts as an improvement/regression at
 *  all — tiny noise-level fluctuations don't get flagged either way. */
export function compareMetrics(
  before: Record<string, number>,
  after: Record<string, number>,
  directions: Record<string, MetricDirection>,
  tolerance = 0.01,
): ComparisonResult {
  const deltas: MetricDelta[] = [];

  for (const metric of Object.keys(directions)) {
    const beforeValue = before[metric] ?? 0;
    const afterValue = after[metric] ?? 0;
    const delta = afterValue - beforeValue;
    const threshold = Math.max(Math.abs(beforeValue) * tolerance, tolerance);
    const direction = directions[metric];

    const better = direction === "higher-better" ? delta > threshold : delta < -threshold;
    const worse = direction === "higher-better" ? delta < -threshold : delta > threshold;

    deltas.push({
      metric,
      before: beforeValue,
      after: afterValue,
      delta,
      improved: better,
      regressed: worse,
    });
  }

  const improvements = deltas.filter((d) => d.improved);
  const regressions = deltas.filter((d) => d.regressed);

  return { deltas, improvements, regressions, regressionDetected: regressions.length > 0 };
}
