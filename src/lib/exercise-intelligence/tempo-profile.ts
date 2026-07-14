import type { QualitativeLevel, TempoProfile } from "./types";

/** Terse constructor used by exercise-catalog.ts to define a tempo profile. */
export function tempo(
  eccentricSec: [number, number],
  concentricSec: [number, number],
  controlRequirement: QualitativeLevel,
  pauseSec?: [number, number],
): TempoProfile {
  const totalRepSec: [number, number] = [
    eccentricSec[0] + concentricSec[0] + (pauseSec?.[0] ?? 0),
    eccentricSec[1] + concentricSec[1] + (pauseSec?.[1] ?? 0),
  ];
  return { eccentricSec, concentricSec, pauseSec, totalRepSec, controlRequirement };
}
