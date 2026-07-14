import { computeHealthScore } from "@/lib/observability/health";

async function main() {
  const report = await computeHealthScore();
  console.log(`\nHealth: ${report.status} (score ${report.score}%)\n`);
  for (const c of report.components) {
    const flag = c.status === "ok" ? "✓" : c.status === "not-configured" ? "—" : c.status === "degraded" ? "⚠" : "✗";
    console.log(`  ${flag} ${c.name}: ${c.detail}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
