import { NextResponse } from "next/server";
import { getOAuthClient, googleConfigured } from "@/lib/google";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.redirect(`${appUrl}/login?error=google_unconfigured`);
  }

  const url = getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
  });

  return NextResponse.redirect(url);
}
