import { NextResponse } from "next/server";
import { z } from "zod";
import { recordError } from "@/lib/observability/error-groups";
import { rateLimit } from "@/lib/platform/rate-limiter";

const errorReportSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).optional(),
});

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Wired into `error.tsx`/`global-error.tsx` — deliberately unauthenticated
 *  (an error boundary can fire before login, or on a public page), so
 *  rate-limited by IP instead to prevent abuse. */
export async function POST(req: Request) {
  const rl = rateLimit("mobileApi", clientIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = errorReportSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const group = await recordError({ ...parsed.data, kind: "client" });
  return NextResponse.json({ ok: true, fingerprint: group.fingerprint });
}
