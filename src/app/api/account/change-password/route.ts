import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, verifyPassword, hashPassword, createSession, bumpTokenVersion } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validators";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/platform/rate-limiter";
import { auditLog } from "@/lib/platform/audit";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit("auth:change-password", clientIp(req), RATE_LIMIT_PRESETS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
  }

  const parsed = changePasswordSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      auditLog.record({ action: "account.password_change.failed", actorId: user.id });
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
  }

  const newHash = await hashPassword(newPassword);
  // Bumping tokenVersion first revokes every session (including this
  // request's own JWT claim); createSession right after re-issues a fresh
  // one for this device only, matching "log out everywhere else" intent.
  const tokenVersion = await bumpTokenVersion(user.id);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  await createSession({
    sub: updated.id,
    email: updated.email,
    role: updated.role,
    onboarded: updated.onboarded,
    tokenVersion,
  });

  auditLog.record({ action: "account.password_changed", actorId: user.id });

  return NextResponse.json({ ok: true });
}
