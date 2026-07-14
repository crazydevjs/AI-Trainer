import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRiskTrend } from "@/lib/performance";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const riskTrend = await getRiskTrend(session.sub);
  return NextResponse.json({ ok: true, riskTrend });
}
