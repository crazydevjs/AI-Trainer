import type { CommonMistake } from "./types";

/** Terse constructor used by exercise-catalog.ts to define a common mistake.
 *  Metadata only — this does not perform any landmark analysis itself; the
 *  Form Engine's own fault detectors are the runtime source of truth. */
export function mistake(
  id: string,
  label: string,
  description: string,
  severity: CommonMistake["severity"] = "moderate",
): CommonMistake {
  return { id, label, description, severity };
}
