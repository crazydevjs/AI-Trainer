import { getDatasetRegistryEntry } from "@/lib/mlops/dataset-registry";
import { requireArg, fail } from "../validation/_shared";

async function main() {
  const args = process.argv.slice(2);
  const datasetName = requireArg(args, 0, "tsx scripts/mlops/dataset-validate.ts <datasetName> [version]");
  const version = args[1] ? Number(args[1]) : undefined;

  const report = await getDatasetRegistryEntry(datasetName, version);
  if (!report) fail(`Dataset "${datasetName}" not found`);

  console.log(`\nDataset: ${report.datasetName} v${report.datasetVersion}`);
  console.log(`  sessions: ${report.totalSessions} (${report.labeledSessions} labeled)`);
  console.log(`  quality score: ${(report.qualityScore * 100).toFixed(0)}%`);
  console.log(`  exercises: ${Object.entries(report.exerciseDistribution).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`);
  console.log(`  camera angles: ${Object.entries(report.cameraAngleDistribution).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`);
  console.log(`  devices: ${Object.entries(report.deviceDistribution).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`);
  console.log(`  lighting: ${Object.entries(report.lightingDistribution).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`);
  console.log(`  difficulty: ${Object.entries(report.difficultyDistribution).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`);
  console.log(`  contributors: ${report.contributors.join(", ") || "—"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
