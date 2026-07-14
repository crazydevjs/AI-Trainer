// Pure scoring functions — turn the current frame's active issues + joint
// metrics into the eight 0-100 scores the spec calls for. ROM reuses the Rep
// Engine's own avgRom telemetry (CoachState.avgRom) rather than re-deriving
// range-of-motion scoring, since that's already computed and tuned there;
// every other score is new, Form-Engine-only signal.

import type { CoachState } from "../rep-counter";
import type { DetectedIssue, FormScores, IssueId, Severity } from "./types";

const SEVERITY_PENALTY: Record<Severity, number> = {
  minor: 4,
  moderate: 10,
  major: 20,
  critical: 32,
};

function penaltyFor(issues: DetectedIssue[], ids: readonly IssueId[]): number {
  let total = 0;
  for (const issue of issues) {
    if (ids.includes(issue.id)) total += SEVERITY_PENALTY[issue.severity] * (0.5 + 0.5 * issue.confidence);
  }
  return total;
}

const JOINT_ISSUES = ["kneeValgus", "kneeVarus", "elbowFlare", "elbowsTooNarrow", "heelLift", "toeLift"] as const;
const ALIGNMENT_ISSUES = [
  "unevenShoulders",
  "unevenHips",
  "hipShift",
  "headLookingDown",
  "neckMisalignment",
  "torsoRotation",
] as const;
const BALANCE_ISSUES = ["lossOfBalance", "weightShift"] as const;
const TECHNIQUE_ISSUES = [
  "roundedBack",
  "overextendedBack",
  "forwardLean",
  "shoulderElevation",
  "barPathDeviation",
] as const;
const ROM_ISSUES = ["incompleteLockout", "partialRange"] as const;

const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface SwayStats {
  hipSwayStdDev: number | null;
  leanStdDev: number | null;
}

export function computeFrameScores(
  activeIssues: DetectedIssue[],
  coachState: CoachState,
  sway: SwayStats
): FormScores {
  const joint = clampScore(100 - penaltyFor(activeIssues, JOINT_ISSUES));
  const alignment = clampScore(100 - penaltyFor(activeIssues, ALIGNMENT_ISSUES));
  const balance = clampScore(
    100 - penaltyFor(activeIssues, BALANCE_ISSUES) - (sway.hipSwayStdDev ?? 0) * 200
  );
  const stability = clampScore(
    100 - penaltyFor(activeIssues, ["coreInstability"]) - (sway.leanStdDev ?? 0) * 6
  );
  const rom = clampScore(coachState.avgRom ?? 100 - penaltyFor(activeIssues, ROM_ISSUES));
  const technique = clampScore(100 - penaltyFor(activeIssues, TECHNIQUE_ISSUES));
  const movementQuality = clampScore((balance + stability + technique) / 3);
  const overall = clampScore((joint + alignment + balance + rom + stability + movementQuality + technique) / 7);

  return { joint, alignment, balance, rom, stability, movementQuality, technique, overall };
}
