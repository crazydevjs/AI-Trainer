import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserProfile } from "@/lib/personalization";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(session.sub);
  return NextResponse.json({ ok: true, profile });
}
