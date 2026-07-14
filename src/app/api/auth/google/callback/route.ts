import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOAuthClient, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google";
import { createSession } from "@/lib/auth";
import { signGoogleLinkToken } from "@/lib/google-link";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  store.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
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
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const created = await prisma.user.create({
        data: {
          email,
          name: payload.name ?? email.split("@")[0],
          image: payload.picture,
          googleId: payload.sub,
          emailVerified: new Date(),
        },
      });
      await createSession({
        sub: created.id,
        email: created.email,
        role: created.role,
        onboarded: created.onboarded,
        tokenVersion: created.tokenVersion,
      });
      return NextResponse.redirect(
        `${appUrl}${created.onboarded ? "/dashboard" : "/onboarding"}`
      );
    }

    if (!user.googleId) {
      // Existing password account with a matching email — don't silently
      // link. Require the user to confirm with their existing password
      // first (account-takeover vector otherwise: anyone who controls a
      // victim's email address could link their own Google identity in).
      const linkToken = await signGoogleLinkToken({
        userId: user.id,
        googleId: payload.sub,
        name: payload.name ?? user.name ?? email.split("@")[0],
        image: payload.picture,
      });
      return NextResponse.redirect(
        `${appUrl}/login/link-google?token=${linkToken}`
      );
    }

    await createSession({
      sub: user.id,
      email: user.email,
      role: user.role,
      onboarded: user.onboarded,
      tokenVersion: user.tokenVersion,
    });

    return NextResponse.redirect(
      `${appUrl}${user.onboarded ? "/dashboard" : "/onboarding"}`
    );
  } catch (e) {
    console.error("google callback error", e);
    return NextResponse.redirect(`${appUrl}/login?error=google_failed`);
  }
}
