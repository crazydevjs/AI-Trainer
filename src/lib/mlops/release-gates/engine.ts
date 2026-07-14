import { mean } from "@/lib/validation/statistics";
import type { ExerciseBenchmarkReport } from "@/lib/validation/evaluation";
import type { RegressionSummary } from "../regression-detector";
import type { GateCheck, GateResult, ReleaseGateThresholds } from "./types";

function macroF1(reports: ExerciseBenchmarkReport[]): number | null {
  const labeled = reports.filter((r) => r.repCounting);
  if (labeled.length === 0) return null;
  return mean(labeled.map((r) => r.repCounting!.macroClassification.f1));
}

export interface EvaluateReleaseGatesInput {
  reports: ExerciseBenchmarkReport[];
  previousReports?: ExerciseBenchmarkReport[];
  regressionSummary: RegressionSummary;
  goldenChecksumValid?: boolean;
  thresholds?: ReleaseGateThresholds;
}

/** The six criteria from Phase 13's brief, each producing exactly one
 *  named check so a release page can show *which* gate failed, not just
 *  a single pass/fail bit. "Memory ≤ threshold" always passes with a
 *  documented note — nothing in this app samples memory usage anywhere
 *  today (see ALGORITHM.md "Known limitations"), so there's no real
 *  number to gate on yet. */
export function evaluateReleaseGates(input: EvaluateReleaseGatesInput): GateResult {
  const thresholds = input.thresholds ?? { maxP95LatencyMs: 60, minF1: 0.7 };
  const checks: GateCheck[] = [];

  const currentF1 = macroF1(input.reports);
  const previousF1 = input.previousReports ? macroF1(input.previousReports) : null;
  if (previousF1 == null) {
    checks.push({ name: "Accuracy ≥ previous release", passed: true, detail: "no previous release to compare against" });
  } else {
    const passed = currentF1 != null && currentF1 >= previousF1;
    checks.push({
      name: "Accuracy ≥ previous release",
      passed,
      detail: `F1 ${((currentF1 ?? 0) * 100).toFixed(1)}% vs previous ${(previousF1 * 100).toFixed(1)}%`,
    });
  }

  const worstP95 = input.reports.length ? Math.max(...input.reports.map((r) => r.latency.p95Ms)) : 0;
  checks.push({
    name: "Latency ≤ threshold",
    passed: worstP95 <= thresholds.maxP95LatencyMs,
    detail: `worst p95 ${worstP95.toFixed(1)}ms (limit ${thresholds.maxP95LatencyMs}ms)`,
  });

  checks.push({
    name: "Memory ≤ threshold",
    passed: true,
    detail: "not currently sampled anywhere in the app — see Known limitations",
  });

  checks.push({
    name: "No critical regressions",
    passed: !input.regressionSummary.hasCriticalRegression,
    detail: `${input.regressionSummary.alerts.filter((a) => a.severity === "critical").length} critical alert(s)`,
  });

  checks.push({
    name: "Golden dataset passes",
    passed: input.goldenChecksumValid !== false,
    detail:
      input.goldenChecksumValid == null
        ? "no golden dataset configured for this release"
        : input.goldenChecksumValid
          ? "checksum verified, no critical regression against golden baseline"
          : "checksum mismatch or critical regression against golden baseline",
  });

  const validationSuitePassed = input.reports.length > 0 && (currentF1 == null || currentF1 >= thresholds.minF1);
  checks.push({
    name: "Validation suite passes",
    passed: validationSuitePassed,
    detail:
      input.reports.length === 0
        ? "no exercises evaluated"
        : `macro F1 ${((currentF1 ?? 0) * 100).toFixed(1)}% (floor ${(thresholds.minF1 * 100).toFixed(0)}%)`,
  });

  return { passed: checks.every((c) => c.passed), checks, evaluatedAt: Date.now() };
}
