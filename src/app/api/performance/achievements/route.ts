import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAchievements } from "@/lib/performance";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const achievements = await getAchievements(session.sub);
  return NextResponse.json({ ok: true, achievements });
}
