import { prisma } from "@/lib/prisma";
import type { ActiveUserStats, StreakStats } from "./types";

function cutoffDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function distinctActiveUsers(sinceDays: number): Promise<number> {
  const rows = await prisma.workoutSession.findMany({
    where: { startedAt: { gte: cutoffDate(sinceDays) } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.length;
}

/** DAU/WAU/MAU from real `WorkoutSession.startedAt` — "active" means
 *  logged at least one AI-tracked set in the window, the only
 *  session-level activity signal this app persists. */
export async function getActiveUserStats(): Promise<ActiveUserStats> {
  const [dau, wau, mau] = await Promise.all([distinctActiveUsers(1), distinctActiveUsers(7), distinctActiveUsers(30)]);
  return { dau, wau, mau, asOf: Date.now() };
}

export async function getStreakStats(): Promise<StreakStats> {
  const users = await prisma.user.findMany({ select: { streak: true } });
  const streaks = users.map((u) => u.streak);
  return {
    avgStreak: streaks.length ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0,
    maxStreak: streaks.length ? Math.max(...streaks) : 0,
    usersWithActiveStreak: streaks.filter((s) => s > 0).length,
  };
}
