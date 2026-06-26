import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeToken } from "@/lib/tokens";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
  }

  const userId = await consumeToken(token, "EMAIL_VERIFY");
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/login?error=expired_token`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(`${appUrl}/dashboard?verified=1`);
}
