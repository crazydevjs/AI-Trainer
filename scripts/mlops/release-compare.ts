import { getRelease } from "@/lib/mlops/release-manager";
import { compareExerciseReports } from "@/lib/validation/comparison";
import { requireArg, fail } from "../validation/_shared";

async function main() {
  const args = process.argv.slice(2);
  const idA = requireArg(args, 0, "tsx scripts/mlops/release-compare.ts <releaseIdA> <releaseIdB>");
  const idB = requireArg(args, 1, "tsx scripts/mlops/release-compare.ts <releaseIdA> <releaseIdB>");

  const releaseA = await getRelease(idA);
  const releaseB = await getRelease(idB);
  if (!releaseA) fail(`Release "${idA}" not found`);
  if (!releaseB) fail(`Release "${idB}" not found`);
  if (!releaseA.evaluation || !releaseB.evaluation) fail("Both releases must have an attached evaluation to compare");

  console.log(`\n${releaseA.name} (${idA}) vs ${releaseB.name} (${idB})`);
  console.log(`Quality score: ${((releaseA.qualityScore ?? 0) * 100).toFixed(0)}% → ${((releaseB.qualityScore ?? 0) * 100).toFixed(0)}%`);

  for (const before of releaseA.evaluation.reports) {
    const after = releaseB.evaluation.reports.find((r) => r.exerciseSlug === before.exerciseSlug);
    if (!after) continue;
    const result = compareExerciseReports(before, after);
    console.log(`\n${before.exerciseSlug}${result.regressionDetected ? "  ⚠ REGRESSION" : ""}`);
    for (const d of result.deltas) {
      const arrow = d.improved ? "↑ better" : d.regressed ? "↓ worse" : "≈ unchanged";
      console.log(`  ${d.metric}: ${d.before.toFixed(3)} → ${d.after.toFixed(3)} (${arrow})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
