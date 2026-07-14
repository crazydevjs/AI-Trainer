import type { ModelRegistrySnapshot } from "../model-registry";
import type { ReleaseEvaluation } from "../evaluation-pipeline";
import type { RegressionSummary } from "../regression-detector";
import type { GateResult } from "../release-gates";

export type ReleaseStatus = "candidate" | "approved" | "rejected" | "deployed";

export interface ReleaseCandidate {
  id: string;
  name: string;
  modelVersions: ModelRegistrySnapshot;
  datasetName: string;
  datasetVersion: number;
  createdAt: number;
  createdBy?: string;
  status: ReleaseStatus;
  evaluation?: ReleaseEvaluation;
  regressionSummary?: RegressionSummary;
  gateResult?: GateResult;
  qualityScore?: number;
  notes?: string;
}
