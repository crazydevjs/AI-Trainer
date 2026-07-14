import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdaptiveThresholds } from "@/lib/personalization";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exerciseId = new URL(req.url).searchParams.get("exerciseId") ?? undefined;
  const thresholds = await getAdaptiveThresholds(session.sub, exerciseId);
  return NextResponse.json({ ok: true, thresholds });
}
