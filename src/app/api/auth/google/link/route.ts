import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { verifyGoogleLinkToken } from "@/lib/google-link";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/platform/rate-limiter";
import { auditLog } from "@/lib/platform/audit";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit("auth:google-link", ip, RATE_LIMIT_PRESETS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!token || !password) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const link = await verifyGoogleLinkToken(token);
    if (!link) {
      return NextResponse.json(
        { error: "This link has expired — sign in with Google again" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: link.userId } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      auditLog.record({ action: "auth.google_link.failed", actorId: user.id, metadata: { ip } });
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: link.googleId,
        image: user.image ?? link.image,
        emailVerified: user.emailVerified ?? new Date(),
      },
    });

    auditLog.record({ action: "auth.google_link.success", actorId: user.id, metadata: { ip } });

    await createSession({
      sub: updated.id,
      email: updated.email,
      role: updated.role,
      onboarded: updated.onboarded,
      tokenVersion: updated.tokenVersion,
    });

    return NextResponse.json({ ok: true, onboarded: updated.onboarded });
  } catch (e) {
    console.error("google link error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
