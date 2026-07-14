import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { signupSchema } from "@/lib/validators";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/platform/rate-limiter";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit("auth:signup", ip, RATE_LIMIT_PRESETS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
      },
    });

    // Fire-and-forget verification email (dev logs the link).
    const token = await createToken(user.id, "EMAIL_VERIFY", 24 * 60 * 60 * 1000);
    sendVerificationEmail(user.email, token).catch(() => {});

    await createSession({
      sub: user.id,
      email: user.email,
      role: user.role,
      onboarded: user.onboarded,
      tokenVersion: user.tokenVersion,
    });

    return NextResponse.json({ ok: true, onboarded: false });
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
