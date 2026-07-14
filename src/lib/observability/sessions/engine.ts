import { prisma } from "@/lib/prisma";
import { getTrace } from "../trace";
import type { SessionDebugView } from "./types";

/** "Show me everything that happened in this one workout" — the
 *  debugging entry point this whole module exists for. Combines the
 *  persisted `WorkoutSession` row with its trace (if one was recorded)
 *  rather than requiring a developer to cross-reference two systems by
 *  hand. */
export async function getSessionDebugView(workoutSessionId: string): Promise<SessionDebugView> {
  const [workoutSession, trace] = await Promise.all([
    prisma.workoutSession.findUnique({
      where: { id: workoutSessionId },
      select: {
        id: true,
        exerciseId: true,
        startedAt: true,
        endedAt: true,
        durationSec: true,
        completionPct: true,
        overallScore: true,
      },
    }),
    getTrace(workoutSessionId),
  ]);

  return { workoutSessionId, workoutSession, trace };
}
