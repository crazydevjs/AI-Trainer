import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getValidationStatus } from "@/lib/validation/validator";

/** Backs the Developer dashboard's VALIDATION panel. Every read here is a
 *  handful of small file-system reads under `.data/validation/` — no
 *  database, no pose model, safe to call on every dashboard load. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const status = await getValidationStatus();
  return NextResponse.json(status);
}
