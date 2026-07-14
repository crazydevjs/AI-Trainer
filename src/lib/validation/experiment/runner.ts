import { saveExperiment } from "./store";
import type { ComparisonResult } from "../comparison";
import type { Experiment } from "./types";

export interface RecordExperimentInput {
  name: string;
  description: string;
  datasetName: string;
  datasetVersion: number;
  poseKey?: string;
  comparison: ComparisonResult;
  winner: string | null;
  notes?: string;
}

/** Turns any `ComparisonResult` (report-vs-report or threshold
 *  original-vs-candidate) into a persisted, named Experiment — the
 *  audit trail "did we actually get better" answers live in. */
export async function recordExperiment(input: RecordExperimentInput): Promise<Experiment> {
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
  });
}
