import type { ExerciseBenchmarkReport } from "../evaluation";

export function toJsonReport(reports: ExerciseBenchmarkReport[]): string {
  return JSON.stringify(reports, null, 2);
}
