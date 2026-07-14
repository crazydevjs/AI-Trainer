export interface Experiment {
  id: string;
  name: string;
  description: string;
  date: number;
  datasetName: string;
  datasetVersion: number;
  poseKey?: string;
  metricsBefore: Record<string, number>;
  metricsAfter: Record<string, number>;
  winner: string | null;
  regressionDetected: boolean;
  notes?: string;
  /** Optional — set by src/lib/mlops/experiment-tracker/ when an
   *  experiment is recorded as part of a release evaluation. Absent for
   *  experiments recorded directly via the Phase 12 CLI (e.g.
   *  `validation:calibrate`), which predates this phase's authorship/
   *  version-tracking fields. */
  author?: string;
  modelVersions?: Record<string, string>;
}
