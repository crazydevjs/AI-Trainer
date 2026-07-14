import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMlopsStatus } from "@/lib/mlops/metrics-dashboard";

/** Backs the Developer dashboard's MLOPS panel. Every read is file-system
 *  reads under `.data/mlops/` and `.data/validation/` plus a dataset
 *  coverage recompute — safe to call on every dashboard load, never on a
 *  live-session path. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const status = await getMlopsStatus();
  return NextResponse.json(status);
}
