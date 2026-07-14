export type DriftDimension =
  | "exerciseMix"
  | "cameraAngle"
  | "device"
  | "lighting"
  | "workoutDuration"
  | "movementSpeed";

export interface CategoricalSnapshot {
  kind: "categorical";
  counts: Record<string, number>;
  total: number;
}

export interface ContinuousSnapshot {
  kind: "continuous";
  mean: number;
  stddev: number;
  sampleCount: number;
}

export type DistributionSnapshot = CategoricalSnapshot | ContinuousSnapshot;

export type DriftSeverity = "none" | "moderate" | "significant";

export interface DriftReport {
  dimension: DriftDimension;
  baseline: DistributionSnapshot;
  current: DistributionSnapshot;
  driftScore: number;
  severity: DriftSeverity;
  method: "psi" | "mean-shift";
}
