import { getExperimentDefinition, computeExperimentResults, selectWinner } from "@/lib/observability/experiments";
import { computeFeatureImpact } from "@/lib/observability/feature-impact";
import { requireArg, fail } from "../validation/_shared";

async function main() {
  const args = process.argv.slice(2);
  const experimentId = requireArg(args, 0, "tsx scripts/observability/experiments-compare.ts <experimentId>");

  const experiment = await getExperimentDefinition(experimentId);
  if (!experiment) fail(`Experiment "${experimentId}" not found`);

  const results = await computeExperimentResults(experimentId);
  console.log(`\n${experiment.name} — metric: ${experiment.metricKey} (${experiment.status})`);
  for (const r of results) {
    console.log(`  ${r.variant}: n=${r.sampleSize} mean=${r.mean.toFixed(4)} stddev=${r.stddev.toFixed(4)}`);
  }

  const winner = await selectWinner(experimentId);
  console.log(`\nWinner: ${winner ?? "not enough data yet (need ≥30 samples per variant)"}`);

  if (experiment.variants.some((v) => v.name === "control") && experiment.variants.some((v) => v.name === "treatment")) {
    const impact = await computeFeatureImpact(experimentId);
    if (impact.deltaPerThousandUsers != null) {
      console.log(
        `Impact: ${impact.deltaPerThousandUsers >= 0 ? "+" : ""}${impact.deltaPerThousandUsers.toFixed(2)} ${impact.metricKey} per 1000 users (treatment vs control)`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
