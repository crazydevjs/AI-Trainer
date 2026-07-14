import { prisma } from "@/lib/prisma";
import type { FunnelStage } from "./types";

function pct(numerator: number, denominator: number): number | null {
  return denominator ? numerator / denominator : null;
}

/** A real, computable funnel from what the schema actually tracks:
 *  signed up → onboarded (`User.onboarded`) → first AI-tracked session →
 *  repeat session (≥2 distinct calendar days with a session). No
 *  fabricated intermediate steps — a true product funnel (e.g. "opened
 *  the exercise picker," "started but abandoned a session") would need
 *  client-side funnel events this app doesn't emit today. */
export async function getOnboardingFunnel(): Promise<FunnelStage[]> {
  const totalUsers = await prisma.user.count();
  const onboardedUsers = await prisma.user.count({ where: { onboarded: true } });

  const sessions = await prisma.workoutSession.findMany({ select: { userId: true, startedAt: true } });
  const daysByUser = new Map<string, Set<string>>();
  for (const s of sessions) {
    const days = daysByUser.get(s.userId) ?? new Set<string>();
    days.add(s.startedAt.toISOString().slice(0, 10));
    daysByUser.set(s.userId, days);
  }

  const usersWithAnySession = daysByUser.size;
  const usersWithRepeatSession = [...daysByUser.values()].filter((days) => days.size >= 2).length;

  return [
    { stage: "signed up", userCount: totalUsers, conversionFromPrevious: null },
    { stage: "onboarded", userCount: onboardedUsers, conversionFromPrevious: pct(onboardedUsers, totalUsers) },
    {
      stage: "first AI session",
      userCount: usersWithAnySession,
      conversionFromPrevious: pct(usersWithAnySession, onboardedUsers),
    },
    {
      stage: "repeat session (2+ days)",
      userCount: usersWithRepeatSession,
      conversionFromPrevious: pct(usersWithRepeatSession, usersWithAnySession),
    },
  ];
}
