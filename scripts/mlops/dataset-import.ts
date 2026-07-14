import { createDataset, addSession, saveDataset, loadDataset, loadSessionFromFile } from "@/lib/validation/dataset";
import { requireArg } from "../validation/_shared";

/** Fills the gap noted in Phase 12's own docs: there was no CLI script
 *  for "create a dataset and add a session," only ground-truth import
 *  (`validation:validate`). Idempotent on the dataset name — reuses the
 *  latest existing version if one exists rather than always creating a
 *  new one, so repeated imports build up one dataset instead of
 *  fragmenting into a new version per session. */
async function main() {
  const args = process.argv.slice(2);
  const datasetName = requireArg(args, 0, "tsx scripts/mlops/dataset-import.ts <datasetName> <sessionFile.json>");
  const sessionFile = requireArg(args, 1, "tsx scripts/mlops/dataset-import.ts <datasetName> <sessionFile.json>");

  const dataset = (await loadDataset(datasetName)) ?? (await createDataset(datasetName));
  const session = await loadSessionFromFile(sessionFile);
  const entry = addSession(dataset, session);
  await saveDataset(dataset);

  console.log(
    `Added session "${session.meta.sessionId}" (${session.meta.exerciseSlug}) to ` +
      `"${datasetName}" v${dataset.manifest.version} as entry ${entry.id}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
