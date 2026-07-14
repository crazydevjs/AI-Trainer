import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotSchema } from "@/lib/validators";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/platform/rate-limiter";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit("auth:resend-verification", ip, RATE_LIMIT_PRESETS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
  }

  try {
    const parsed = forgotSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    // Enumeration-safe: only send when the account exists and is unverified,
    // but always respond the same way.
    if (user && !user.emailVerified) {
      const token = await createToken(user.id, "EMAIL_VERIFY", 24 * 60 * 60 * 1000);
      sendVerificationEmail(user.email, token).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("resend-verification error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
