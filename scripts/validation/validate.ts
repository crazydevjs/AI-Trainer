import { promises as fs } from "fs";
import { loadDataset, saveDataset, attachGroundTruth } from "@/lib/validation/dataset";
import { importGroundTruthCsv, importGroundTruthJson, saveGroundTruthLabels } from "@/lib/validation/ground-truth";
import { requireArg, fail } from "./_shared";

async function main() {
  const args = process.argv.slice(2);
  const datasetName = requireArg(
    args,
    0,
    "tsx scripts/validation/validate.ts <datasetName> <groundTruthFile.json|.csv>",
  );
  const filePath = requireArg(
    args,
    1,
    "tsx scripts/validation/validate.ts <datasetName> <groundTruthFile.json|.csv>",
  );

  const dataset = await loadDataset(datasetName);
  if (!dataset) fail(`Dataset "${datasetName}" not found — create it first (see DEVELOPER_GUIDE.md)`);

  const raw = await fs.readFile(filePath, "utf-8");
  const labels = filePath.toLowerCase().endsWith(".csv") ? importGroundTruthCsv(raw) : importGroundTruthJson(raw);
  await saveGroundTruthLabels(labels);

  let attached = 0;
  for (const label of labels) {
    const entry = dataset.entries.find((e) => e.session.meta.sessionId === label.sessionId);
    if (entry) {
      attachGroundTruth(dataset, entry.id, label.id);
      attached++;
    }
  }
  await saveDataset(dataset);

  console.log(
    `Imported ${labels.length} ground-truth label(s), attached ${attached} to ` +
      `"${datasetName}" v${dataset.manifest.version}.`,
  );
  if (attached < labels.length) {
    console.warn(`${labels.length - attached} label(s) had no matching session in this dataset.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
