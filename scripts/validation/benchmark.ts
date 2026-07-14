import { runFullValidation } from "@/lib/validation/validator";
import { requireArg } from "./_shared";

async function main() {
  const args = process.argv.slice(2);
  const datasetName = requireArg(args, 0, "tsx scripts/validation/benchmark.ts <datasetName> [datasetVersion]");
  const version = args[1] ? Number(args[1]) : undefined;

  const reports = await runFullValidation(datasetName, version, ["json"]);

  console.log(`\nBenchmark: ${datasetName}${version ? ` v${version}` : ""}\n`);
  for (const r of reports) {
    console.log(`${r.exerciseSlug} — ${r.sessionCount} session(s) (${r.labeledSessionCount} labeled)`);
    if (r.repCounting) {
      const c = r.repCounting.macroClassification;
      console.log(
        `  precision ${(c.precision * 100).toFixed(0)}%  recall ${(c.recall * 100).toFixed(0)}%  ` +
          `f1 ${(c.f1 * 100).toFixed(0)}%  mean count error ${r.repCounting.meanCountAbsError.toFixed(2)}`,
      );
    } else {
      console.log("  no ground truth labeled yet — run validate.ts first");
    }
    console.log(`  avg fps ${r.avgFps.toFixed(1)}  p95 inference ${r.latency.p95Ms.toFixed(1)}ms\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
