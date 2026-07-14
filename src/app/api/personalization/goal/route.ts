import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { goalProfileSchema } from "@/lib/validators";
import { getGoalProfile, setGoalProfile } from "@/lib/personalization";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goal = await getGoalProfile(session.sub);
  return NextResponse.json({ ok: true, goal });
}

// No UI consumes this yet — a thin, programmatic settable surface for a
// future UI to call. See ALGORITHM.md "Personalized Learning Engine".
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = goalProfileSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid goal" }, { status: 400 });
  }

  const goal = await setGoalProfile(
    session.sub,
    parsed.data.goal,
    parsed.data.targetFrequency,
    parsed.data.notes
  );
  return NextResponse.json({ ok: true, goal });
}
