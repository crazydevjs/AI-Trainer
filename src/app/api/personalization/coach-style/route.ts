import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { coachStyleSchema } from "@/lib/validators";
import { getCoachingPreference, setCoachingPreference } from "@/lib/personalization";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const coachingPreference = await getCoachingPreference(session.sub);
  return NextResponse.json({ ok: true, coachingPreference });
}

// No UI consumes this yet — a thin, programmatic settable surface for a
// future UI to call. See ALGORITHM.md "Personalized Learning Engine".
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = coachStyleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid coach style" }, { status: 400 });
  }

  const coachingPreference = await setCoachingPreference(session.sub, parsed.data.coachingPreference);
  return NextResponse.json({ ok: true, coachingPreference });
}
