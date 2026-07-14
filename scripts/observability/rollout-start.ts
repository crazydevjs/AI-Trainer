import { startRollout, advanceRollout, listRollouts } from "@/lib/observability/rollouts";
import { requireArg } from "../validation/_shared";

/** If an active rollout already exists for `flagKey`, this advances it to
 *  its next stage instead of starting a duplicate — one command covers
 *  both "start the rollout" and "bump it to the next percentage." */
async function main() {
  const args = process.argv.slice(2);
  const flagKey = requireArg(args, 0, "tsx scripts/observability/rollout-start.ts <flagKey> <stage1,stage2,...>");
  const stagesArg = args[1];

  const existing = (await listRollouts()).find((r) => r.flagKey === flagKey && r.status === "active");
  if (existing) {
    const advanced = await advanceRollout(existing.id);
    console.log(
      `Advanced rollout ${advanced.id} for flag "${flagKey}" to stage ${advanced.currentStageIndex + 1}/${advanced.stages.length} (${advanced.stages[advanced.currentStageIndex]}%) [${advanced.status}].`,
    );
    return;
  }

  if (!stagesArg) {
    console.error(
      `No active rollout for "${flagKey}" — provide stages to start one: tsx scripts/observability/rollout-start.ts ${flagKey} <stage1,stage2,...>`,
    );
    process.exit(1);
  }
  const stages = stagesArg.split(",").map(Number);
  const rollout = await startRollout(flagKey, stages);
  console.log(
    `Started rollout ${rollout.id} for flag "${flagKey}" — stage 1/${rollout.stages.length} (${rollout.stages[0]}%) is live now. Run this command again to advance to the next stage.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
