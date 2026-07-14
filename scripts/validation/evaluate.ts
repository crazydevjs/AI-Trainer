import { runFullValidation } from "@/lib/validation/validator";
import { requireArg } from "./_shared";

async function main() {
  const args = process.argv.slice(2);
  const datasetName = requireArg(args, 0, "tsx scripts/validation/evaluate.ts <datasetName> [datasetVersion]");
  const version = args[1] ? Number(args[1]) : undefined;

  const reports = await runFullValidation(datasetName, version, ["json", "markdown"]);
  console.log(
    `Evaluated ${reports.length} exercise(s) from "${datasetName}". ` +
      `JSON + Markdown reports written under .data/validation/reports/${datasetName}/.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
