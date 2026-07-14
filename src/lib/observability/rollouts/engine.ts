import { featureFlagStore } from "@/lib/platform/feature-flags";
import { saveRollout, getRollout, newRolloutId } from "./store";
import type { Rollout } from "./types";

function applyStagePercentage(flagKey: string, percentage: number): void {
  const existing = featureFlagStore.getRule(flagKey);
  featureFlagStore.setRule({
    key: flagKey,
    enabled: percentage > 0,
    rolloutPercentage: percentage,
    userOverrides: existing?.userOverrides,
    description: existing?.description ?? `Managed by observability/rollouts/`,
  });
}

/** Genuinely drives Phase 11's feature-flag rollout percentage for
 *  `flagKey` — this isn't just bookkeeping, `advanceRollout()`/
 *  `rollbackRollout()` actually change what `isEnabled()` returns for the
 *  rest of *this process's* lifetime. Verified by hand: calling
 *  `startRollout()` then `isEnabled()` in the same script reflects the
 *  new percentage immediately. The real limitation (see ALGORITHM.md
 *  "Known limitations"): Phase 11's `featureFlagStore` is an in-memory
 *  singleton with no cross-process backing store, so running the CLI as
 *  a separate one-off `tsx` invocation — as `rollout:start`/`rollout:stop`
 *  do — never reaches an already-running Next.js server's own in-memory
 *  copy of the flag. Wiring a rollout into a live server needs either a
 *  shared flag backend (Redis, DB) or calling these functions from inside
 *  that same server process (e.g. an admin API route), not a sibling CLI
 *  process. */
export async function startRollout(flagKey: string, stages: number[]): Promise<Rollout> {
  if (stages.length === 0) throw new Error("A rollout needs at least one stage");
  const rollout: Rollout = {
    id: newRolloutId(),
    flagKey,
    stages,
    currentStageIndex: 0,
    status: "active",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  applyStagePercentage(flagKey, stages[0]);
  await saveRollout(rollout);
  return rollout;
}

export async function advanceRollout(rolloutId: string): Promise<Rollout> {
  const rollout = await getRollout(rolloutId);
  if (!rollout) throw new Error(`Rollout "${rolloutId}" not found`);
  if (rollout.status !== "active") throw new Error(`Rollout "${rolloutId}" is not active (status: ${rollout.status})`);

  const stageIndex = Math.min(rollout.currentStageIndex + 1, rollout.stages.length - 1);
  const reachedFinalStage = stageIndex === rollout.stages.length - 1;

  applyStagePercentage(rollout.flagKey, rollout.stages[stageIndex]);
  const updated: Rollout = {
    ...rollout,
    currentStageIndex: stageIndex,
    status: reachedFinalStage ? "completed" : "active",
    updatedAt: Date.now(),
  };
  await saveRollout(updated);
  return updated;
}

/** "Stop" a rollout — always a rollback (percentage to 0), never leaves
 *  the flag partially rolled out in an ambiguous state. */
export async function rollbackRollout(rolloutId: string): Promise<Rollout> {
  const rollout = await getRollout(rolloutId);
  if (!rollout) throw new Error(`Rollout "${rolloutId}" not found`);

  applyStagePercentage(rollout.flagKey, 0);
  const updated: Rollout = { ...rollout, status: "rolled-back", updatedAt: Date.now() };
  await saveRollout(updated);
  return updated;
}
