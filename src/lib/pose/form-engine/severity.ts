// Pure severity classification — combines duration, frequency, magnitude,
// movement phase and measurement confidence into one of four bands. Kept
// deliberately conservative: low-confidence readings are capped below
// "critical" regardless of magnitude, since a monocular camera shouldn't
// assert its most alarming label on a shaky measurement (see ALGORITHM.md
// "Scientific Accuracy").

import type { Severity } from "./types";

export function classifySeverity(input: {
  durationMs: number;
  occurrences: number;
  magnitude: number; // 0..1
  phase: string;
  confidence: number; // 0..1
}): Severity {
  const durationScore = Math.min(1, input.durationMs / 3000);
  const frequencyScore = Math.min(1, input.occurrences / 5);
  const score =
    input.magnitude * 0.45 + durationScore * 0.25 + frequencyScore * 0.15 + input.confidence * 0.15;

  let severity: Severity;
  if (score >= 0.75) severity = "critical";
  else if (score >= 0.55) severity = "major";
  else if (score >= 0.32) severity = "moderate";
  else severity = "minor";

  // Confidence gate: don't let a noisy, low-confidence reading claim the top
  // severity band.
  if (input.confidence < 0.5 && severity === "critical") severity = "major";
  if (input.confidence < 0.35 && (severity === "critical" || severity === "major")) severity = "moderate";

  return severity;
}
