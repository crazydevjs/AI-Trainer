import { createReleaseCandidate, attachEvaluationResults, listReleases } from "@/lib/mlops/release-manager";
import { runEvaluationPipeline } from "@/lib/mlops/evaluation-pipeline";
import { detectRegressions } from "@/lib/mlops/regression-detector";
import { evaluateReleaseGates } from "@/lib/mlops/release-gates";
import { computeReleaseQualityScore } from "@/lib/mlops/quality-score";
import { getDatasetRegistryEntry } from "@/lib/mlops/dataset-registry";
import { verifyGoldenChecksum } from "@/lib/mlops/golden-datasets";
import { recordBenchmarkRun, getLatestBenchmarkRun } from "@/lib/mlops/benchmark-registry";
import { getLatestDeployedRelease } from "@/lib/mlops/deployment-history";
import { mean } from "@/lib/validation/statistics";
import type { ExerciseBenchmarkReport } from "@/lib/validation/evaluation";
import { requireArg, parseFlags, parseDatasetRef } from "../validation/_shared";

/** Runs the full release evaluation: Phase 12 benchmarking, drift vs. an
 *  optional baseline dataset, regression detection against up to three
 *  baselines (previous release / golden dataset / latest production),
 *  release-gate checks, and a composite quality score — then saves
 *  everything onto one ReleaseCandidate record. */
async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseFlags(args);
  const usage =
    "tsx scripts/mlops/release-create.ts <name> <datasetName> [datasetVersion] " +
    "[--baseline=name@version] [--golden=name@version]";
  const name = requireArg(positional, 0, usage);
  const datasetName = requireArg(positional, 1, usage);
  const datasetVersion = positional[2] ? Number(positional[2]) : undefined;

  const release = await createReleaseCandidate({ name, datasetName, datasetVersion: datasetVersion ?? 0 });
  console.log(`Created release candidate ${release.id} ("${name}")`);

  const baselineRef = flags.baseline ? parseDatasetRef(flags.baseline) : null;
  const evaluation = await runEvaluationPipeline({
    datasetName,
    datasetVersion,
    baselineDatasetName: baselineRef?.name,
    baselineDatasetVersion: baselineRef?.version,
  });

  const existingReleases = await listReleases();
  const previousRelease = existingReleases.find((r) => r.id !== release.id && r.evaluation);
  const latestProductionRelease = await getLatestDeployedRelease();
  const latestProductionReports = latestProductionRelease
    ? existingReleases.find((r) => r.id === latestProductionRelease.releaseId)?.evaluation?.reports
    : undefined;

  let goldenChecksumValid: boolean | undefined;
  let goldenBaselineReports: ExerciseBenchmarkReport[] | undefined;
  if (flags.golden) {
    const goldenRef = parseDatasetRef(flags.golden);
    goldenChecksumValid = await verifyGoldenChecksum(goldenRef.name, goldenRef.version);
    const priorGoldenRun = await getLatestBenchmarkRun(goldenRef.name);
    goldenBaselineReports = priorGoldenRun?.reports;
    // Record a fresh benchmark run against the golden dataset so the
    // *next* release has something to compare against, bootstrapping the
    // very first time this golden dataset is used.
    await recordBenchmarkRun(goldenRef.name, goldenRef.version);
  }

  const regressionSummary = detectRegressions(evaluation.reports, {
    previousRelease: previousRelease?.evaluation?.reports,
    goldenBaseline: goldenBaselineReports,
    latestProduction: latestProductionReports,
  });

  const datasetEntry = await getDatasetRegistryEntry(datasetName, datasetVersion);
  const labeledF1s = evaluation.reports.filter((r) => r.repCounting).map((r) => r.repCounting!.macroClassification.f1);
  const qualityScore = computeReleaseQualityScore({
    macroF1: labeledF1s.length ? mean(labeledF1s) : 0,
    hasCriticalRegression: regressionSummary.hasCriticalRegression,
    datasetQualityScore: datasetEntry?.qualityScore ?? 0,
  }).overall;

  const gateResult = evaluateReleaseGates({
    reports: evaluation.reports,
    previousReports: previousRelease?.evaluation?.reports,
    regressionSummary,
    goldenChecksumValid,
  });

  await attachEvaluationResults(release.id, { evaluation, regressionSummary, gateResult, qualityScore });

  console.log(`\n${gateResult.passed ? "✓ PASSED" : "✗ FAILED"} release gates:`);
  for (const check of gateResult.checks) {
    console.log(`  ${check.passed ? "✓" : "✗"} ${check.name} — ${check.detail}`);
  }
  console.log(`\nQuality score: ${(qualityScore * 100).toFixed(0)}%`);
  if (regressionSummary.alerts.length) {
    console.log(`\nRegression alerts:`);
    for (const alert of regressionSummary.alerts) {
      console.log(`  [${alert.severity}] ${alert.exerciseSlug}.${alert.metric} vs ${alert.comparedAgainst}: ${alert.before.toFixed(3)} → ${alert.after.toFixed(3)}`);
    }
  }
  console.log(`\nRelease id: ${release.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
