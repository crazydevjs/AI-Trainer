// Named rep state machine — a transparent relabeling of the signals
// rep-counter.ts already computes (phase/progress/peak/turnaround), not a
// new acceptance algorithm. Pure, DOM-free functions so they're testable in
// isolation from the stateful RepCounter class.

export type RepState =
  | "WAITING"
  | "READY"
  | "DESCENDING"
  | "BOTTOM"
  | "ASCENDING"
  | "LOCKOUT"
  | "REP_COMPLETE";

export type RejectionCode =
  | "half_rep"
  | "rom_too_small"
  | "lockout_missing"
  | "too_fast"
  | "low_confidence"
  | "wrong_direction"
  | "unstable"
  | "unsafe_form";

export interface ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ValidationResult {
  accepted: boolean;
  checks: ValidationCheck[];
  rejectionCode: RejectionCode | null;
}

/** Continuous (non-decision-frame) state classification. LOCKOUT and
 *  REP_COMPLETE are assigned directly by rep-counter.ts at its existing
 *  accept/turnaround branch — that's the one place the real decision is
 *  made, and it stays untouched here. */
export function deriveRepState(
  prev: RepState,
  ctx: {
    tracking: boolean;
    phase: "up" | "down";
    progress: number;
    prevProgress: number;
    peak: number;
  }
): { state: RepState; reason: string } {
  if (!ctx.tracking) {
    return { state: "WAITING", reason: "Landmarks not confidently tracked" };
  }
  if (ctx.phase === "up") {
    return { state: "READY", reason: "At rest, waiting for the next rep" };
  }
  // phase === "down": somewhere between the top and the turnaround.
  const settingNewPeak = ctx.progress >= ctx.peak - 0.005;
  if (settingNewPeak) {
    if (Math.abs(ctx.progress - ctx.prevProgress) < 0.004 && ctx.progress > 0.3) {
      return { state: "BOTTOM", reason: "Depth plateaued — about to reverse" };
    }
    return { state: "DESCENDING", reason: "Moving toward the worked position" };
  }
  return { state: "ASCENDING", reason: "Reversing back out of the bottom" };
}

/** Purely descriptive packaging — takes the accept/reject decision as input
 *  (computed by rep-counter.ts's existing, untouched logic) rather than
 *  recomputing it, so this can never disagree with the real decision. */
export function buildValidation(input: {
  accepted: boolean;
  rejectionCode: RejectionCode | null;
  peak: number;
  reqProgress: number;
  repConfidence: number; // 0..1
  minConf: number;
  formErrorCount: number;
  stability: number; // 0..100
  minStability: number;
  tooFast: boolean;
  strict: boolean;
}): ValidationResult {
  const checks: ValidationCheck[] = [
    {
      id: "rom",
      label: "Full range of motion",
      passed: input.peak >= input.reqProgress,
      detail: `${Math.round(input.peak * 100)}% of ${Math.round(input.reqProgress * 100)}% required`,
    },
    {
      id: "confidence",
      label: "Landmark confidence",
      passed: input.repConfidence >= input.minConf,
      detail: `${Math.round(input.repConfidence * 100)}%`,
    },
    {
      id: "tempo",
      label: "Controlled tempo",
      passed: !input.tooFast,
      detail: input.strict ? "enforced" : "advisory only",
    },
    {
      id: "stability",
      label: "Stable, no excessive swing",
      passed: input.stability >= input.minStability,
      detail: input.strict ? "enforced" : "advisory only",
    },
    {
      id: "form",
      label: "No unsafe form errors",
      passed: input.formErrorCount === 0,
    },
  ];
  return { accepted: input.accepted, checks, rejectionCode: input.rejectionCode };
}
