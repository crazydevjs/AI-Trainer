import type { ROMProfile } from "./types";

/** Terse constructor used by exercise-catalog.ts to define a ROM profile. */
export function rom(
  primaryJoint: string,
  fullRangeDeg: [number, number],
  depthCriteria: string,
  notes?: string,
): ROMProfile {
  return { primaryJoint, fullRangeDeg, depthCriteria, notes };
}
