import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  getWorkoutCompletionStats,
  getExercisePopularity,
  getCoachUsageStats,
  getPersonalizationAdoptionStats,
} from "@/lib/observability/analytics";

const PAGE_SIZE = 25;

/** The one genuinely new read this phase — no existing Developer
 *  dashboard exposes a per-user list (they're all aggregate-only). Also
 *  folds in the Phase 14 business-analytics functions (workout
 *  completion, exercise popularity, coach usage, personalization
 *  adoption) since `getObservabilityStatus()` doesn't include them. */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page")) || 1);

  const [users, total, completion, exercisePopularity, coachUsage, personalization] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        onboarded: true,
        emailVerified: true,
        createdAt: true,
        lastActiveDate: true,
        subscription: { select: { planId: true, status: true } },
      },
    }),
    prisma.user.count(),
    getWorkoutCompletionStats(),
    getExercisePopularity(),
    getCoachUsageStats(),
    getPersonalizationAdoptionStats(),
  ]);

  return NextResponse.json({
    users,
    page,
    pageSize: PAGE_SIZE,
    total,
    analytics: { completion, exercisePopularity, coachUsage, personalization },
  });
}
