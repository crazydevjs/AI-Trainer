import { getExerciseProfile } from "@/lib/exercise-intelligence";
import { computeDatasetQualityScore } from "../quality-score";
import type { Dataset } from "@/lib/validation/dataset";
import type { GroundTruthLabel } from "@/lib/validation/ground-truth";
import type { DatasetCoverageReport } from "./types";

function tally(values: (string | undefined)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

/** Reads coverage dimensions straight off each session's `meta` (the same
 *  `SessionTags` — cameraAngle/device/lighting — a developer already
 *  fills in when exporting a debug session) and cross-references
 *  difficulty from Exercise Intelligence's catalog (Phase 10) rather than
 *  inventing a second difficulty taxonomy. Contributor metadata comes
 *  from ground truth labels' `labeledBy`, since that's the only place a
 *  human identity is actually recorded today. */
export function computeCoverageReport(
  dataset: Dataset,
  groundTruthBySessionId: Map<string, GroundTruthLabel>,
): DatasetCoverageReport {
  const exercises = dataset.entries.map((e) => e.session.meta.exerciseSlug);
  const cameraAngles = dataset.entries.map((e) => e.session.meta.cameraAngle as string | undefined);
  const devices = dataset.entries.map((e) => e.session.meta.device as string | undefined);
  const lighting = dataset.entries.map((e) => e.session.meta.lighting as string | undefined);
  const difficulties = dataset.entries.map((e) => {
    const profile = getExerciseProfile(e.session.meta.poseKey ?? e.session.meta.exerciseSlug);
    return profile?.difficulty;
  });

  const contributors = [
    ...new Set(
      dataset.entries
        .map((e) => (e.groundTruthId ? groundTruthBySessionId.get(e.session.meta.sessionId)?.labeledBy : undefined))
        .filter((v): v is string => !!v),
    ),
  ];

  const labeledSessions = dataset.entries.filter((e) => e.groundTruthId != null).length;

  const qualityScore = computeDatasetQualityScore({
    distinctExercises: new Set(exercises).size,
    distinctCameraAngles: new Set(cameraAngles.filter(Boolean)).size,
    distinctDevices: new Set(devices.filter(Boolean)).size,
    labeledFraction: dataset.entries.length ? labeledSessions / dataset.entries.length : 0,
  }).overall;

  return {
    datasetName: dataset.manifest.name,
    datasetVersion: dataset.manifest.version,
    totalSessions: dataset.entries.length,
    labeledSessions,
    exerciseDistribution: tally(exercises),
    cameraAngleDistribution: tally(cameraAngles),
    deviceDistribution: tally(devices),
    lightingDistribution: tally(lighting),
    difficultyDistribution: tally(difficulties),
    contributors,
    resolutionDistribution: {},
    qualityScore,
    generatedAt: Date.now(),
  };
}
