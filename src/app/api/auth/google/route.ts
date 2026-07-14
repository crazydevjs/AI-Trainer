import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getOAuthClient, googleConfigured, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.redirect(`${appUrl}/login?error=google_unconfigured`);
  }

  // Random per-attempt state, verified on callback — closes the OAuth
  // CSRF vector where an attacker could otherwise trigger a victim's
  // browser to complete a login/link using the attacker's Google code.
  const state = randomBytes(32).toString("hex");
  const store = await cookies();
  store.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });

  const url = getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state,
  });

  return NextResponse.redirect(url);
}
