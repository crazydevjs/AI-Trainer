import type { ThresholdCandidate, ThresholdTestResult } from "../threshold-testing";

/** A named, versioned snapshot of a candidate threshold set — never the
 *  real production config in `exercises.ts`. "Active" here means "the
 *  version the validation tooling currently treats as the candidate under
 *  test," a bookkeeping pointer for this framework, not a runtime switch. */
export interface ThresholdSetVersion {
  id: string;
  poseKey: string;
  label: string;
  config: ThresholdCandidate["config"];
  createdAt: number;
  notes?: string;
  basedOnDatasetName?: string;
  basedOnDatasetVersion?: number;
}

export interface ABCalibrationResult {
  a: ThresholdTestResult;
  b: ThresholdTestResult;
  winner: "a" | "b" | "tie";
}
