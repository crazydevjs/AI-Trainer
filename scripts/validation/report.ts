import { runFullValidation } from "@/lib/validation/validator";
import { requireArg } from "./_shared";

async function main() {
  const args = process.argv.slice(2);
  const datasetName = requireArg(args, 0, "tsx scripts/validation/report.ts <datasetName> [datasetVersion]");
  const version = args[1] ? Number(args[1]) : undefined;

  await runFullValidation(datasetName, version, ["json", "markdown", "csv", "html"]);
  console.log(`All report formats (json/markdown/csv/html) written under .data/validation/reports/${datasetName}/.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
