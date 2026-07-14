import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getObservabilityStatus } from "@/lib/observability/dashboards";

/** Backs the Developer dashboard's OBSERVABILITY panel. Aggregates
 *  health/experiments/rollouts/latency/cost/alerts/errors/retention/
 *  feature-usage in one call — none of it triggers a new check, only
 *  displays the most recent state of each. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const status = await getObservabilityStatus();
  return NextResponse.json(status);
}
