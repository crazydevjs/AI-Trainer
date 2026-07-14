import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/platform/rate-limiter";
import { auditLog } from "@/lib/platform/audit";
import { telemetry } from "@/lib/platform/telemetry";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit("auth", ip, RATE_LIMIT_PRESETS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many login attempts — try again shortly" }, { status: 429 });
  }

  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.passwordHash) {
      auditLog.record({ action: "auth.login.failed", actorId: null, metadata: { email: email.toLowerCase(), ip } });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      auditLog.record({ action: "auth.login.failed", actorId: user.id, metadata: { ip } });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      auditLog.record({ action: "auth.login.unverified", actorId: user.id, metadata: { ip } });
      return NextResponse.json(
        { error: "Verify your email before logging in", code: "EMAIL_NOT_VERIFIED" },
        { status: 403 }
      );
    }

    await createSession({
      sub: user.id,
      email: user.email,
      role: user.role,
      onboarded: user.onboarded,
      tokenVersion: user.tokenVersion,
    });

    auditLog.record({ action: "auth.login.success", actorId: user.id, metadata: { ip } });
    telemetry.track("auth.login", { userId: user.id });

    return NextResponse.json({ ok: true, onboarded: user.onboarded });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
