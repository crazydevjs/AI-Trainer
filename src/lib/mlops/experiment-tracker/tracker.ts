import { saveExperiment, type Experiment } from "@/lib/validation/experiment";
import type { ComparisonResult } from "@/lib/validation/comparison";
import { getCurrentVersions } from "../model-registry";

export interface RecordReleaseExperimentInput {
  name: string;
  description: string;
  datasetName: string;
  datasetVersion: number;
  poseKey?: string;
  comparison: ComparisonResult;
  winner: string | null;
  notes?: string;
  author?: string;
}

/** Same stored shape and location as Phase 12's `recordExperiment()`
 *  (`.data/validation/experiments/`) — this just additionally captures
 *  `author` and a snapshot of the model registry's current versions,
 *  the two fields Phase 12's original CLI never needed. Calls
 *  `saveExperiment()` directly (not `recordExperiment()`) since that
 *  function's field mapping is a fixed object literal that doesn't pass
 *  through extra fields — reproducing its metricsBefore/After extraction
 *  here rather than modifying Phase 12's runner. */
export async function recordReleaseExperiment(input: RecordReleaseExperimentInput): Promise<Experiment> {
  const modelVersions = await getCurrentVersions();
  const versionStrings = Object.fromEntries(Object.entries(modelVersions).map(([k, v]) => [k, v.version]));

  const metricsBefore = Object.fromEntries(input.comparison.deltas.map((d) => [d.metric, d.before]));
  const metricsAfter = Object.fromEntries(input.comparison.deltas.map((d) => [d.metric, d.after]));

  return saveExperiment({
    name: input.name,
    description: input.description,
    datasetName: input.datasetName,
    datasetVersion: input.datasetVersion,
    poseKey: input.poseKey,
    metricsBefore,
    metricsAfter,
    winner: input.winner,
    regressionDetected: input.comparison.regressionDetected,
    notes: input.notes,
    author: input.author,
    modelVersions: versionStrings,
  });
}
