import type { SessionResult } from "@/components/trainer/live-session";

/** Gate for the Playwright E2E "workout session" spec. Deliberately its
 *  own explicit public env var (not NODE_ENV, which Next.js already
 *  fixes to "development"/"production" for dev/build) — must be set
 *  on purpose by the test runner's `webServer` command, never true in
 *  real local dev or production. When active, the trainer skips the
 *  live camera/pose-detection phase entirely (there is no camera in a
 *  headless CI browser) and completes with canned-but-plausible result
 *  data, so the E2E test still exercises the real save-to-`/api/
 *  sessions` → summary-screen flow end-to-end. */
export function isE2ETestMode(): boolean {
  return process.env.NEXT_PUBLIC_E2E_TEST === "1";
}

export function buildCannedSessionResult(params: {
  isHold: boolean;
  targetReps: number;
  targetSets: number;
  repsMode: "fixed" | "failure";
  weighted: boolean;
  startWeightKg: number;
}): SessionResult {
  const { isHold, targetReps, targetSets, repsMode, weighted, startWeightKg } = params;
  const sets = Array.from({ length: targetSets }, (_, i) => ({
    setNumber: i + 1,
    reps: targetReps,
    formScore: 88,
    romScore: 90,
    weightKg: weighted ? startWeightKg : undefined,
  }));

  return {
    durationSec: 60 * targetSets,
    totalReps: isHold ? targetReps : targetReps * targetSets,
    invalidReps: 0,
    formScore: 88,
    romScore: isHold ? 100 : 90,
    tempoScore: 92,
    stabilityScore: 90,
    confidenceScore: 95,
    completionPct: 100,
    caloriesBurned: 25 * targetSets,
    topMistakes: [],
    targetReps,
    repsMode,
    sets,
  };
}
