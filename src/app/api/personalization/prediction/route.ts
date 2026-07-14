import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPrediction } from "@/lib/personalization";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exerciseId = new URL(req.url).searchParams.get("exerciseId");
  const prediction = await getPrediction(session.sub, exerciseId);
  return NextResponse.json({ ok: true, prediction });
}
