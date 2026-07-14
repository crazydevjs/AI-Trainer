import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { submitFeedback } from "@/lib/mlops/feedback-pipeline";
import { rateLimit } from "@/lib/platform/rate-limiter";

const feedbackSchema = z.object({
  sessionId: z.string().optional(),
  exerciseSlug: z.string().optional(),
  type: z.enum([
    "false-positive",
    "false-negative",
    "incorrect-coaching",
    "incorrect-recommendation",
    "incorrect-exercise-detection",
  ]),
  description: z.string().min(1).max(2000),
});

/** The one end-user-facing surface in this phase — everything else is
 *  Developer dashboard / CLI. A future "Report an issue" UI can call this
 *  today without any backend work; none exists yet (see Known
 *  limitations). Routing into the human-review queue happens separately
 *  via `npm run feedback:sync`, not automatically on submit. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit("session", session.sub);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = feedbackSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const entry = await submitFeedback({ userId: session.sub, ...parsed.data });
  return NextResponse.json({ ok: true, id: entry.id });
}
