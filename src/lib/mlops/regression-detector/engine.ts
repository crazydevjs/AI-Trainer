import { compareExerciseReports } from "@/lib/validation/comparison";
import type { ExerciseBenchmarkReport } from "@/lib/validation/evaluation";
import type { BaselineKind, RegressionAlert, RegressionSeverity, RegressionSummary } from "./types";

/** Accuracy/count-error regressions are "critical" — they directly affect
 *  user-facing correctness (more false positives/negatives). Latency/FPS
 *  regressions are "warning" — a performance concern, not a correctness
 *  one. A deliberate severity call, not derived from anything in the
 *  numbers themselves. */
const CRITICAL_METRICS = new Set(["precision", "recall", "f1", "meanCountAbsError"]);

function severityFor(metric: string): RegressionSeverity {
  return CRITICAL_METRICS.has(metric) ? "critical" : "warning";
}

function compareAgainstBaseline(
  candidateReports: ExerciseBenchmarkReport[],
  baselineReports: ExerciseBenchmarkReport[],
  comparedAgainst: BaselineKind,
): RegressionAlert[] {
  const alerts: RegressionAlert[] = [];
  for (const candidate of candidateReports) {
    const baseline = baselineReports.find((r) => r.exerciseSlug === candidate.exerciseSlug);
    if (!baseline) continue;

    const result = compareExerciseReports(baseline, candidate);
    for (const regression of result.regressions) {
      alerts.push({
        exerciseSlug: candidate.exerciseSlug,
        metric: regression.metric,
        comparedAgainst,
        before: regression.before,
        after: regression.after,
        delta: regression.delta,
        severity: severityFor(regression.metric),
      });
    }
  }
  return alerts;
}

/** Compares a release candidate's reports against up to three baselines
 *  at once (previous release / golden dataset / latest production) —
 *  any of the three can regress independently, and all three are worth
 *  knowing about; missing baselines are simply skipped. */
export function detectRegressions(
  candidateReports: ExerciseBenchmarkReport[],
  baselines: Partial<Record<BaselineKind, ExerciseBenchmarkReport[]>>,
): RegressionSummary {
  const alerts: RegressionAlert[] = [];
  for (const kind of Object.keys(baselines) as BaselineKind[]) {
    const reports = baselines[kind];
    if (!reports) continue;
    alerts.push(...compareAgainstBaseline(candidateReports, reports, kind));
  }

  return { alerts, hasCriticalRegression: alerts.some((a) => a.severity === "critical"), generatedAt: Date.now() };
}
