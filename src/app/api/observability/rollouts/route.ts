import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { startRollout, advanceRollout, rollbackRollout } from "@/lib/observability/rollouts";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), flagKey: z.string().min(1), stages: z.array(z.number()).min(1) }),
  z.object({ action: z.literal("advance"), rolloutId: z.string().min(1) }),
  z.object({ action: z.literal("rollback"), rolloutId: z.string().min(1) }),
]);

/** Unlike `scripts/observability/rollout-*.ts` (a separate one-off `tsx`
 *  process — see ALGORITHM.md "Known limitations" for why that never
 *  reaches a running server's own feature-flag state), this route
 *  executes *inside* the live Next.js server process, so it genuinely
 *  changes what `isEnabled()` returns for real traffic on this instance
 *  immediately. Still per-instance, not shared across a horizontally
 *  scaled deployment (same limitation Phase 11's feature-flags always
 *  had). */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const body = parsed.data;
  try {
    if (body.action === "start") {
      return NextResponse.json({ ok: true, rollout: await startRollout(body.flagKey, body.stages) });
    }
    if (body.action === "advance") {
      return NextResponse.json({ ok: true, rollout: await advanceRollout(body.rolloutId) });
    }
    return NextResponse.json({ ok: true, rollout: await rollbackRollout(body.rolloutId) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Rollout action failed" }, { status: 400 });
  }
}
