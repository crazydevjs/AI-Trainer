import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotSchema } from "@/lib/validators";
import { createToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/platform/rate-limiter";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit("auth:forgot-password", ip, RATE_LIMIT_PRESETS.auth);
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

    // Only send when the account exists, but always respond the same way.
    if (user) {
      const token = await createToken(
        user.id,
        "PASSWORD_RESET",
        60 * 60 * 1000
      );
      sendResetEmail(user.email, token).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("forgot-password error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
