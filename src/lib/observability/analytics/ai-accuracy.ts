import { loadLatestReport, type LatestReportPointer } from "@/lib/validation/validator";

/** Reuses Phase 12's validation framework rather than recomputing
 *  accuracy here — "AI accuracy reports" in this phase's brief means
 *  surfacing that data on the observability dashboard, not a second
 *  accuracy engine. Null until `npm run validation:evaluate` has run at
 *  least once. */
export async function getAiAccuracyReport(): Promise<LatestReportPointer | null> {
  return loadLatestReport();
}
