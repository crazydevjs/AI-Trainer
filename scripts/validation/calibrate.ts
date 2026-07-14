import { promises as fs } from "fs";
import { loadDataset } from "@/lib/validation/dataset";
import { listGroundTruthLabels } from "@/lib/validation/ground-truth";
import { testThresholdCandidate, type ThresholdCandidate } from "@/lib/validation/threshold-testing";
import { saveThresholdVersion } from "@/lib/validation/calibration";
import { recordExperiment } from "@/lib/validation/experiment";
import { requireArg, fail } from "./_shared";

/** Candidate file shape: { "label": "...", "config": {
 *  "requiredProgressOverride": 0.8 } } — or use "requiredProgressDeltaPct"
 *  (e.g. -0.1) to nudge each session's own originally-recorded required
 *  fraction instead of pinning everyone to one absolute value. */
async function main() {
  const args = process.argv.slice(2);
  const datasetName = requireArg(
    args,
    0,
    "tsx scripts/validation/calibrate.ts <datasetName> <poseKey> <candidateFile.json>",
  );
  const poseKey = requireArg(
    args,
    1,
    "tsx scripts/validation/calibrate.ts <datasetName> <poseKey> <candidateFile.json>",
  );
  const candidateFile = requireArg(
    args,
    2,
    "tsx scripts/validation/calibrate.ts <datasetName> <poseKey> <candidateFile.json>",
  );

  const dataset = await loadDataset(datasetName);
  if (!dataset) fail(`Dataset "${datasetName}" not found`);

  const candidateRaw = JSON.parse(await fs.readFile(candidateFile, "utf-8"));
  const candidate: ThresholdCandidate = {
    label: candidateRaw.label ?? candidateFile,
    poseKey,
    config: candidateRaw.config ?? candidateRaw,
  };

  const labels = await listGroundTruthLabels();
  const groundTruthBySessionId = new Map(labels.map((l) => [l.sessionId, l]));

  const result = testThresholdCandidate(dataset, groundTruthBySessionId, candidate);
  console.log(`\nThreshold test: ${candidate.label} (${poseKey}), ${result.sessionsReplayed} session(s) replayed`);
  console.log(
    `  original  f1 ${(result.original.classification.f1 * 100).toFixed(0)}%  ` +
      `mean count error ${result.original.countAbsError.toFixed(2)}`,
  );
  console.log(
    `  candidate f1 ${(result.candidate.classification.f1 * 100).toFixed(0)}%  ` +
      `mean count error ${result.candidate.countAbsError.toFixed(2)}`,
  );
  console.log(result.comparison.regressionDetected ? "  ⚠ regression detected" : "  no regression detected");

  await saveThresholdVersion({
    poseKey,
    label: candidate.label,
    config: candidate.config,
    basedOnDatasetName: dataset.manifest.name,
    basedOnDatasetVersion: dataset.manifest.version,
  });
  await recordExperiment({
    name: `${candidate.label} calibration`,
    description: `Threshold candidate test for ${poseKey} against dataset ${datasetName} v${dataset.manifest.version}`,
    datasetName: dataset.manifest.name,
    datasetVersion: dataset.manifest.version,
    poseKey,
    comparison: result.comparison,
    winner: result.comparison.regressionDetected ? "original" : "candidate",
  });
  console.log(`\nSaved calibration version and experiment record.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
