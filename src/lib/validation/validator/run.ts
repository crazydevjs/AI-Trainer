import { loadDataset } from "../dataset";
import { listGroundTruthLabels } from "../ground-truth";
import { evaluateDataset, type ExerciseBenchmarkReport } from "../evaluation";
import { saveReports } from "./store";
import type { ReportFormat } from "../reports";

/** The single call the CLI's `evaluate`/`benchmark`/`report` scripts and
 *  the Developer dashboard all go through: load a saved dataset, load
 *  every ground-truth label on disk, evaluate, persist the reports. */
export async function runFullValidation(
  datasetName: string,
  datasetVersion?: number,
  formats: ReportFormat[] = ["json", "markdown"],
): Promise<ExerciseBenchmarkReport[]> {
  const dataset = await loadDataset(datasetName, datasetVersion);
  if (!dataset) {
    throw new Error(`Dataset "${datasetName}"${datasetVersion ? ` v${datasetVersion}` : ""} not found`);
  }

  const labels = await listGroundTruthLabels();
  const groundTruthBySessionId = new Map(labels.map((l) => [l.sessionId, l]));

  const reports = evaluateDataset(dataset, groundTruthBySessionId);
  await saveReports(dataset.manifest.name, dataset.manifest.version, reports, formats);
  return reports;
}
