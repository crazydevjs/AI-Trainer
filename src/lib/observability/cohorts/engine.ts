import { prisma } from "@/lib/prisma";
import type { CohortRow } from "./types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Weekly signup cohorts × week-N retention, computed entirely from real
 *  `User.createdAt` and `WorkoutSession.startedAt` — "retained in week N"
 *  means at least one AI-tracked session in that week, the same activity
 *  signal `retention/` uses for DAU/WAU/MAU. This is a real cohort table,
 *  not a proxy — the only approximation is bucketing cohorts by a fixed
 *  week grid from `weeksBack` ago rather than calendar (Mon-Sun) weeks. */
export async function getSignupCohorts(weeksBack = 8, weeksForward = 4): Promise<CohortRow[]> {
  const now = Date.now();
  const earliestCohortStart = now - weeksBack * WEEK_MS;

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: new Date(earliestCohortStart) } },
    select: { id: true, createdAt: true },
  });
  if (users.length === 0) return [];

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    select: { userId: true, startedAt: true },
  });

  const sessionTimesByUser = new Map<string, number[]>();
  for (const s of sessions) {
    const times = sessionTimesByUser.get(s.userId) ?? [];
    times.push(s.startedAt.getTime());
    sessionTimesByUser.set(s.userId, times);
  }

  const cohorts = new Map<string, { start: number; userIds: string[] }>();
  for (const user of users) {
    const weekIndex = Math.floor((user.createdAt.getTime() - earliestCohortStart) / WEEK_MS);
    const start = earliestCohortStart + weekIndex * WEEK_MS;
    const key = new Date(start).toISOString().slice(0, 10);
    const cohort = cohorts.get(key) ?? { start, userIds: [] };
    cohort.userIds.push(user.id);
    cohorts.set(key, cohort);
  }

  const rows: CohortRow[] = [];
  for (const [key, { start, userIds }] of cohorts) {
    const retentionByWeek: (number | null)[] = [];
    for (let week = 0; week <= weeksForward; week++) {
      const windowStart = start + week * WEEK_MS;
      const windowEnd = windowStart + WEEK_MS;
      if (windowStart > now) {
        retentionByWeek.push(null);
        continue;
      }
      const activeCount = userIds.filter((id) =>
        (sessionTimesByUser.get(id) ?? []).some((t) => t >= windowStart && t < windowEnd),
      ).length;
      retentionByWeek.push(userIds.length ? activeCount / userIds.length : 0);
    }
    rows.push({ cohortWeekStart: key, cohortSize: userIds.length, retentionByWeek });
  }

  return rows.sort((a, b) => a.cohortWeekStart.localeCompare(b.cohortWeekStart));
}
