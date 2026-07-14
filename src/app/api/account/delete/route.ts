import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, verifyPassword, destroySession } from "@/lib/auth";
import { deleteAccountSchema } from "@/lib/validators";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/platform/rate-limiter";
import { auditLog } from "@/lib/platform/audit";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Immediate hard delete, no grace period (per product decision for the
 *  v1 beta). Schema-verified safe: every direct `User` relation is
 *  `onDelete: Cascade` except `PersonalBest.workoutSessionId` (`SetNull`
 *  — but `PersonalBest.userId` itself still cascades), so a single
 *  `prisma.user.delete()` fully removes the account and all owned data
 *  with no manual child-table cleanup. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit("auth:account-delete", clientIp(req), RATE_LIMIT_PRESETS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
  }

  const parsed = deleteAccountSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { password, confirmEmail } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (user.passwordHash) {
    if (!password || !(await verifyPassword(password, user.passwordHash))) {
      auditLog.record({ action: "account.delete.failed", actorId: user.id });
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
  } else {
    // Google-only account — no password to check. Require typing the
    // account email back, the standard confirmation for OAuth-only
    // deletion flows (there's nothing else the user could prove).
    if (!confirmEmail || confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Email confirmation doesn't match" }, { status: 401 });
    }
  }

  await prisma.user.delete({ where: { id: user.id } });
  auditLog.record({ action: "account.deleted", actorId: user.id });
  await destroySession();

  return NextResponse.json({ ok: true });
}
