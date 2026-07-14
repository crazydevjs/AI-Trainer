import type { DatasetCoverageReport } from "../dataset-registry";
import type { BenchmarkRun } from "../benchmark-registry";
import type { Experiment } from "@/lib/validation/experiment";
import type { ReleaseCandidate } from "../release-manager";
import type { RegressionAlert } from "../regression-detector";
import type { DriftReport } from "../drift-detection";
import type { GoldenDataset } from "../golden-datasets";

export interface MlopsStatus {
  datasetCoverage: DatasetCoverageReport[];
  goldenDatasets: GoldenDataset[];
  benchmarkHistory: BenchmarkRun[];
  experimentHistory: Experiment[];
  releaseHistory: ReleaseCandidate[];
  regressionAlerts: RegressionAlert[];
  driftAlerts: DriftReport[];
  latestReleaseQualityScore: number | null;
}
