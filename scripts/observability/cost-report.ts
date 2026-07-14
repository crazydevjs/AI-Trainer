import { computeCostReport } from "@/lib/observability/cost";

async function main() {
  const days = process.argv[2] ? Number(process.argv[2]) : 30;
  const report = await computeCostReport(days);

  console.log(`\nCost report — last ${report.windowDays} day(s)\n`);
  for (const item of report.lineItems) {
    console.log(`  ${item.category}: $${item.amountUsd.toFixed(4)} — ${item.basis}`);
  }
  console.log(`\nTotal: $${report.totalUsd.toFixed(4)}`);
  console.log(`Per workout: $${report.costPerWorkout.toFixed(6)}`);
  console.log(`Per user: $${report.costPerUser.toFixed(6)}`);
  console.log(`Monthly projection: $${report.monthlyProjection.toFixed(2)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
