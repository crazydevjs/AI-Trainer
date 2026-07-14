import { rollbackRollout } from "@/lib/observability/rollouts";
import { requireArg } from "../validation/_shared";

/** "Stop" is always a rollback (flag percentage → 0) — see
 *  rollouts/engine.ts for why there's no partial-stop state. */
async function main() {
  const args = process.argv.slice(2);
  const rolloutId = requireArg(args, 0, "tsx scripts/observability/rollout-stop.ts <rolloutId>");

  const rollout = await rollbackRollout(rolloutId);
  console.log(`Rolled back rollout ${rollout.id} for flag "${rollout.flagKey}" — percentage set to 0.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
