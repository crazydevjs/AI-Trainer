import type { ExerciseBenchmarkReport } from "../evaluation";

const HEADER = [
  "exerciseSlug",
  "poseKey",
  "sessionCount",
  "labeledSessionCount",
  "precision",
  "recall",
  "f1",
  "meanCountAbsError",
  "avgFps",
  "p95InferenceMs",
];

export function toCsvReport(reports: ExerciseBenchmarkReport[]): string {
  const rows = reports.map((r) =>
    [
      r.exerciseSlug,
      r.poseKey ?? "",
      r.sessionCount,
      r.labeledSessionCount,
      r.repCounting?.macroClassification.precision ?? "",
      r.repCounting?.macroClassification.recall ?? "",
      r.repCounting?.macroClassification.f1 ?? "",
      r.repCounting?.meanCountAbsError ?? "",
      r.avgFps.toFixed(1),
      r.latency.p95Ms.toFixed(1),
    ].join(","),
  );
  return [HEADER.join(","), ...rows].join("\n") + "\n";
}
