import { testThresholdCandidate } from "../threshold-testing";
import type { ThresholdCandidate } from "../threshold-testing";
import type { Dataset } from "../dataset";
import type { GroundTruthLabel } from "../ground-truth";
import type { ABCalibrationResult } from "./types";

const TIE_TOLERANCE = 0.01;

export function runABCalibration(
  dataset: Dataset,
  groundTruthBySessionId: Map<string, GroundTruthLabel>,
  a: ThresholdCandidate,
  b: ThresholdCandidate,
): ABCalibrationResult {
  const resultA = testThresholdCandidate(dataset, groundTruthBySessionId, a);
  const resultB = testThresholdCandidate(dataset, groundTruthBySessionId, b);

  const f1Delta = resultB.candidate.classification.f1 - resultA.candidate.classification.f1;
  const winner = Math.abs(f1Delta) <= TIE_TOLERANCE ? "tie" : f1Delta > 0 ? "b" : "a";

  return { a: resultA, b: resultB, winner };
}
