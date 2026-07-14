import type { LabeledSession } from "@/lib/validation/dataset";
import type { DriftDimension } from "./types";

export const CATEGORICAL_DIMENSIONS: DriftDimension[] = ["exerciseMix", "cameraAngle", "device", "lighting"];
export const CONTINUOUS_DIMENSIONS: DriftDimension[] = ["workoutDuration", "movementSpeed"];

export function extractCategorical(sessions: LabeledSession[], dimension: DriftDimension): (string | undefined)[] {
  switch (dimension) {
    case "exerciseMix":
      return sessions.map((s) => s.meta.exerciseSlug);
    case "cameraAngle":
      return sessions.map((s) => s.meta.cameraAngle as string | undefined);
    case "device":
      return sessions.map((s) => s.meta.device as string | undefined);
    case "lighting":
      return sessions.map((s) => s.meta.lighting as string | undefined);
    default:
      return [];
  }
}

/** `movementSpeed` has no direct per-session velocity metric in the debug
 *  export — reps-per-second (`totalReps / durationSec`) is a coarse but
 *  honest proxy, documented as such rather than left unlabeled. */
export function extractContinuous(sessions: LabeledSession[], dimension: DriftDimension): number[] {
  switch (dimension) {
    case "workoutDuration":
      return sessions.map((s) => s.summary.durationSec).filter((v) => typeof v === "number" && v > 0);
    case "movementSpeed":
      return sessions
        .map((s) => (s.summary.durationSec > 0 ? s.summary.totalReps / s.summary.durationSec : null))
        .filter((v): v is number => v != null);
    default:
      return [];
  }
}
