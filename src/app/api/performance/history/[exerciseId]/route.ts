import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getExerciseHistory } from "@/lib/performance";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { exerciseId } = await params;
  const history = await getExerciseHistory(session.sub, exerciseId);
  return NextResponse.json({ ok: true, history });
}
