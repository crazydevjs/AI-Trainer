import { loadDataset } from "@/lib/validation/dataset";
import { listGroundTruthLabels } from "@/lib/validation/ground-truth";
import { evaluateDataset } from "@/lib/validation/evaluation";
import { detectAllDrift } from "../drift-detection";
import { getCurrentVersions } from "../model-registry";
import type { DriftReport } from "../drift-detection";
import type { ReleaseEvaluation } from "./types";

export interface RunEvaluationPipelineInput {
  datasetName: string;
  datasetVersion?: number;
  /** Supplying a baseline dataset also runs drift detection between it
   *  and the target dataset — omitted, `driftReports` comes back empty. */
  baselineDatasetName?: string;
  baselineDatasetVersion?: number;
}

/** The single entry point release-gates/regression-detector build on:
 *  load a dataset, run Phase 12's evaluation, optionally compare its
 *  distribution against a baseline dataset, and snapshot which model
 *  versions were current — one bundle covering "how good is this
 *  candidate and did the data it was tested on shift." */
export async function runEvaluationPipeline(input: RunEvaluationPipelineInput): Promise<ReleaseEvaluation> {
  const dataset = await loadDataset(input.datasetName, input.datasetVersion);
  if (!dataset) throw new Error(`Dataset "${input.datasetName}" not found`);

  const labels = await listGroundTruthLabels();
  const groundTruthBySessionId = new Map(labels.map((l) => [l.sessionId, l]));
  const reports = evaluateDataset(dataset, groundTruthBySessionId);

  let driftReports: DriftReport[] = [];
  if (input.baselineDatasetName) {
    const baselineDataset = await loadDataset(input.baselineDatasetName, input.baselineDatasetVersion);
    if (baselineDataset) {
      driftReports = detectAllDrift(
        baselineDataset.entries.map((e) => e.session),
        dataset.entries.map((e) => e.session),
      );
    }
  }

  const modelVersions = await getCurrentVersions();

  return {
    datasetName: dataset.manifest.name,
    datasetVersion: dataset.manifest.version,
    modelVersions,
    reports,
    driftReports,
    generatedAt: Date.now(),
  };
}
