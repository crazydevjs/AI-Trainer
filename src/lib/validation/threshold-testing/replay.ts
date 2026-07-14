import { buildValidation, type RejectionCode, type ValidationResult } from "@/lib/pose/state-machine";
import type { ThresholdCandidate } from "./types";

/** A recorded `peak` is already expressed on *that session's own*
 *  progress scale (`progress = (angle - startAngle) / (activeAngle -
 *  startAngle)`, computed live by rep-counter.ts). Re-deriving a
 *  candidate's required-progress fraction from a *different*
 *  startAngle/activeAngle pair would silently compare `peak` on one
 *  scale against a threshold meant for another — a real bug caught while
 *  smoke-testing this module. Instead, a candidate directly overrides the
 *  required-progress fraction (or nudges the session's own originally-
 *  recorded fraction by a relative delta), so the comparison always
 *  stays on the scale `peak` was actually measured on. */
export function resolveCandidateRequiredProgress(
  originalRequired: number,
  candidate: Pick<ThresholdCandidate["config"], "requiredProgressOverride" | "requiredProgressDeltaPct">,
): number {
  if (candidate.requiredProgressOverride != null) return candidate.requiredProgressOverride;
  if (candidate.requiredProgressDeltaPct != null) {
    return Math.max(0, Math.min(1, originalRequired * (1 + candidate.requiredProgressDeltaPct)));
  }
  return originalRequired;
}

/** Re-derives only the ROM-acceptance check through the real, imported
 *  `buildValidation()` — the exact function `rep-counter.ts` itself calls
 *  — for the one input a session log actually records (`peak`). Every
 *  other check (confidence/tempo/stability/form) is carried over
 *  unchanged from the originally recorded outcome: threshold candidates
 *  in this module only vary the ROM/turnaround acceptance fraction, never
 *  those other gates, and the continuous per-frame signals they depend on
 *  aren't in the debug export (see ALGORITHM.md "Known limitations"). */
export function replayRomCheck(
  originalValidation: ValidationResult,
  peak: number,
  candidateReqProgress: number,
): ValidationResult {
  const realRomCheck = buildValidation({
    accepted: true, // discarded — only the "rom" check below is used
    rejectionCode: null,
    peak,
    reqProgress: candidateReqProgress,
    repConfidence: 1,
    minConf: 0,
    formErrorCount: 0,
    stability: 100,
    minStability: 0,
    tooFast: false,
    strict: true,
  }).checks.find((c) => c.id === "rom")!;

  const checks = originalValidation.checks.map((check) => (check.id === "rom" ? realRomCheck : check));
  const accepted = checks.every((c) => c.passed);
  const rejectionCode: RejectionCode | null = accepted
    ? null
    : !realRomCheck.passed
      ? "rom_too_small"
      : originalValidation.rejectionCode;

  return { accepted, checks, rejectionCode };
}
