import { recordAlert, checkAlertConditions } from "@/lib/observability/alerts";

/** Two things, both useful for verifying the alerting pipeline works:
 *  1. Fires one synthetic test alert (a common ops practice — "page
 *     yourself to confirm paging works").
 *  2. Runs the real `checkAlertConditions()` against current state, so
 *     this doubles as an on-demand check outside whatever schedule ends
 *     up calling it in production. */
async function main() {
  const test = await recordAlert("latency", "warning", "Synthetic test alert — alerting pipeline is working");
  console.log(`Test alert recorded: ${test.id}`);

  const fired = await checkAlertConditions();
  console.log(`\n${fired.length} real alert(s) fired from current conditions:`);
  for (const alert of fired) console.log(`  [${alert.severity}] ${alert.kind}: ${alert.message}`);
  if (fired.length === 0) console.log("  (none — all monitored conditions are within threshold)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
