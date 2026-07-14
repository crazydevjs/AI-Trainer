import { getObservabilityStatus } from "@/lib/observability/dashboards";

async function main() {
  const status = await getObservabilityStatus();

  console.log(`\nHealth: ${status.health.status} (score ${status.health.score}%)`);
  for (const c of status.health.components) console.log(`  ${c.status === "ok" ? "✓" : c.status === "not-configured" ? "—" : "✗"} ${c.name}: ${c.detail}`);

  console.log(`\nRetention: DAU ${status.retention.dau} · WAU ${status.retention.wau} · MAU ${status.retention.mau}`);

  console.log(`\nExperiments (${status.experiments.length}):`);
  for (const e of status.experiments) console.log(`  ${e.name} [${e.status}]${e.winner ? ` winner: ${e.winner}` : ""}`);

  console.log(`\nRollouts (${status.rollouts.length}):`);
  for (const r of status.rollouts) console.log(`  ${r.flagKey}: stage ${r.currentStageIndex + 1}/${r.stages.length} (${r.stages[r.currentStageIndex]}%) [${r.status}]`);

  console.log(`\nLatency: api p95 ${status.latency.api ? status.latency.api.p95Ms.toFixed(0) + "ms" : "n/a"}`);
  console.log(`Cost: $${status.cost.totalUsd.toFixed(4)} (projected $${status.cost.monthlyProjection.toFixed(2)}/mo)`);

  console.log(`\nUnresolved alerts (${status.alerts.length}):`);
  for (const a of status.alerts) console.log(`  [${a.severity}] ${a.kind}: ${a.message}`);

  console.log(`\nTop errors (${status.topErrors.length}):`);
  for (const e of status.topErrors) console.log(`  ${e.count}x ${e.message} (${e.kind})`);

  console.log(`\nOnboarding funnel:`);
  for (const stage of status.featureUsage) {
    console.log(`  ${stage.stage}: ${stage.userCount}${stage.conversionFromPrevious != null ? ` (${(stage.conversionFromPrevious * 100).toFixed(0)}%)` : ""}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
