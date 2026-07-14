import type { ExerciseBenchmarkReport } from "@/lib/validation/evaluation";
import type { ModelRegistrySnapshot } from "../model-registry";

/** Ties a Phase 12 benchmark run to *which versions of every component*
 *  were current when it ran — Phase 12's own report store
 *  (`.data/validation/reports/`) has the numbers; this is what makes them
 *  attributable to a specific model-registry snapshot later. */
export interface BenchmarkRun {
  id: string;
  datasetName: string;
  datasetVersion: number;
  modelVersions: ModelRegistrySnapshot;
  reports: ExerciseBenchmarkReport[];
  createdAt: number;
}
