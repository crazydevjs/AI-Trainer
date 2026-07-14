import type { ExperimentVariant } from "../ab-testing";

export type ExperimentStatus = "draft" | "running" | "completed";

export interface ExperimentDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  metricKey: string;
  variants: ExperimentVariant[];
  status: ExperimentStatus;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  winner: string | null;
}

export interface ExperimentOutcome {
  experimentId: string;
  userId: string;
  variant: string;
  metricValue: number;
  recordedAt: number;
}

export interface ExperimentResult {
  variant: string;
  sampleSize: number;
  mean: number;
  stddev: number;
}
