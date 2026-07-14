import type { ExerciseBenchmarkReport } from "@/lib/validation/evaluation";
import type { DriftReport } from "../drift-detection";
import type { ModelRegistrySnapshot } from "../model-registry";

export interface ReleaseEvaluation {
  datasetName: string;
  datasetVersion: number;
  modelVersions: ModelRegistrySnapshot;
  reports: ExerciseBenchmarkReport[];
  /** Empty when no baseline dataset was supplied — drift detection is
   *  opt-in, not every evaluation has an obvious "before" dataset to
   *  compare against. */
  driftReports: DriftReport[];
  generatedAt: number;
}
