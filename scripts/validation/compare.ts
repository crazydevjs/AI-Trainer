import { promises as fs } from "fs";
import { compareExerciseReports } from "@/lib/validation/comparison";
import type { ExerciseBenchmarkReport } from "@/lib/validation/evaluation";
import { requireArg } from "./_shared";

async function main() {
  const args = process.argv.slice(2);
  const fileA = requireArg(args, 0, "tsx scripts/validation/compare.ts <reportA.json> <reportB.json>");
  const fileB = requireArg(args, 1, "tsx scripts/validation/compare.ts <reportA.json> <reportB.json>");

  const reportsA = JSON.parse(await fs.readFile(fileA, "utf-8")) as ExerciseBenchmarkReport[];
  const reportsB = JSON.parse(await fs.readFile(fileB, "utf-8")) as ExerciseBenchmarkReport[];

  for (const before of reportsA) {
    const after = reportsB.find((r) => r.exerciseSlug === before.exerciseSlug);
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
