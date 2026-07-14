import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPerformanceTrend } from "@/lib/performance";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exerciseId = new URL(req.url).searchParams.get("exerciseId");
  const trend = await getPerformanceTrend(session.sub, exerciseId);
  return NextResponse.json({ ok: true, trend });
}
