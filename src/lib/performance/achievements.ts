// Achievement-condition detection + award. Reuses the existing
// Achievement/UserAchievement tables (already support arbitrary types via
// `slug`) — no new models needed. The catalog rows themselves are seeded
// additively in prisma/seed.ts.

import { awardAchievement, getUserStatistics, hasAchievement } from "./performance-store";
import type { AchievementUpdate, PerformanceEngineSessionInput, PersonalBestUpdate } from "./types";

export const ACHIEVEMENT_SLUGS = {
  newPr: "new-pr",
  techniqueMilestone: "technique-milestone",
  hundredPerfectReps: "100-perfect-reps",
  tenPerfectSessions: "10-perfect-sessions",
  consistencyStreak: "consistency-streak",
  weeklyStreak: "weekly-streak",
  monthlyStreak: "monthly-streak",
} as const;

const TECHNIQUE_MILESTONE_SCORE = 95;

/** Call after updatePersonalBests()/upsertUserStatistics() so streak/
 *  perfect-rep counts reflect this session. */
export async function detectAndAwardAchievements(
  input: PerformanceEngineSessionInput,
  newPersonalBests: PersonalBestUpdate[]
): Promise<AchievementUpdate[]> {
  const userId = input.userId;
  const out: AchievementUpdate[] = [];

  async function tryAward(slug: string, title: string) {
    const already = await hasAchievement(userId, slug);
    if (already) return;
    const awarded = await awardAchievement(userId, slug);
    if (awarded) out.push({ slug, title, isNew: true });
  }

  if (newPersonalBests.length > 0) await tryAward(ACHIEVEMENT_SLUGS.newPr, "New Personal Record");

  if ((input.formAnalysis?.scores.technique ?? 0) >= TECHNIQUE_MILESTONE_SCORE) {
    await tryAward(ACHIEVEMENT_SLUGS.techniqueMilestone, "Technique Milestone");
  }

  const stats = await getUserStatistics(userId);
  if ((stats?.totalPerfectReps ?? 0) >= 100) {
    await tryAward(ACHIEVEMENT_SLUGS.hundredPerfectReps, "100 Perfect Reps");
  }
  if ((stats?.totalPerfectSessions ?? 0) >= 10) {
    await tryAward(ACHIEVEMENT_SLUGS.tenPerfectSessions, "10 Perfect Sessions");
  }
  const streak = stats?.consistencyStreak ?? 0;
  if (streak >= 3) await tryAward(ACHIEVEMENT_SLUGS.consistencyStreak, "Consistency Streak");
  if (streak >= 7) await tryAward(ACHIEVEMENT_SLUGS.weeklyStreak, "Weekly Streak");
  if (streak >= 30) await tryAward(ACHIEVEMENT_SLUGS.monthlyStreak, "Monthly Streak");

  return out;
}
