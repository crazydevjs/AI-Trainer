import { loadDataset } from "@/lib/validation/dataset";
import { detectAllDrift } from "@/lib/mlops/drift-detection";
import { requireArg, fail, parseDatasetRef } from "../validation/_shared";

async function main() {
  const args = process.argv.slice(2);
  const baselineArg = requireArg(args, 0, "tsx scripts/mlops/drift-check.ts <baselineName>@<version> <currentName>@<version>");
  const currentArg = requireArg(args, 1, "tsx scripts/mlops/drift-check.ts <baselineName>@<version> <currentName>@<version>");

  const baselineRef = parseDatasetRef(baselineArg);
  const currentRef = parseDatasetRef(currentArg);

  const baselineDataset = await loadDataset(baselineRef.name, baselineRef.version);
  const currentDataset = await loadDataset(currentRef.name, currentRef.version);
  if (!baselineDataset) fail(`Dataset "${baselineRef.name}" v${baselineRef.version} not found`);
  if (!currentDataset) fail(`Dataset "${currentRef.name}" v${currentRef.version} not found`);

  const reports = detectAllDrift(
    baselineDataset.entries.map((e) => e.session),
    currentDataset.entries.map((e) => e.session),
  );

  console.log(`\nDrift report: ${baselineArg} → ${currentArg}\n`);
  for (const report of reports) {
    const flag = report.severity === "significant" ? "⚠⚠" : report.severity === "moderate" ? "⚠" : "✓";
    console.log(`${flag} ${report.dimension} (${report.method}): score ${report.driftScore.toFixed(3)} — ${report.severity}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
