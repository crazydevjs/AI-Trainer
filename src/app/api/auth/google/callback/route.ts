import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOAuthClient } from "@/lib/google";
import { createSession } from "@/lib/auth";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
    }

    const email = payload.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: payload.name ?? email.split("@")[0],
          image: payload.picture,
          googleId: payload.sub,
          emailVerified: new Date(),
        },
      });
    } else if (!user.googleId) {
      // Link Google to an existing email/password account.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.sub,
          image: user.image ?? payload.picture,
          emailVerified: user.emailVerified ?? new Date(),
        },
      });
    }

    await createSession({
      sub: user.id,
      email: user.email,
      role: user.role,
      onboarded: user.onboarded,
    });

    return NextResponse.redirect(
      `${appUrl}${user.onboarded ? "/dashboard" : "/onboarding"}`
    );
  } catch (e) {
    console.error("google callback error", e);
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
  }
}
