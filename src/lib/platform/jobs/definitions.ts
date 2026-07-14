import { getPerformanceTrend, getWorkoutHistory, getAchievements } from "@/lib/performance";
import { getPrediction } from "@/lib/personalization";
import { dispatchNotification, weeklySummaryTemplate, workoutReminderTemplate } from "../notifications";
import { personalizationCache } from "../cache";
import { logger } from "../monitoring/logger";
import { rateLimiterSnapshot } from "../rate-limiter";
import { listQueues } from "../queue";

/** Each job is a plain async function over one user id, built entirely on
 *  the existing Performance/Personalization read APIs (`@/lib/performance`,
 *  `@/lib/personalization`) — no engine file changes, no new scoring
 *  logic. `jobs/scheduler.ts` is what turns these into recurring work;
 *  these functions are just as usable from a one-off script or a future
 *  real cron/queue worker. */

export async function weeklyReview(userId: string): Promise<void> {
  const history = await getWorkoutHistory(userId);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sessionsThisWeek = history.filter((h) => h.startedAt.getTime() >= weekAgo).length;
  await dispatchNotification(weeklySummaryTemplate(sessionsThisWeek), userId);
}

export async function monthlyReview(userId: string): Promise<void> {
  const trend = await getPerformanceTrend(userId);
  logger.info("monthly review generated", { userId, trend: trend?.thirtyDayTrend ?? "no-data" });
}

export async function achievementGeneration(userId: string) {
  return getAchievements(userId);
}

export async function progressPredictionRefresh(userId: string) {
  const prediction = await getPrediction(userId);
  await personalizationCache.set(`prediction:${userId}`, prediction, 60 * 30);
  return prediction;
}

export async function emailGeneration(userId: string): Promise<void> {
  const history = await getWorkoutHistory(userId);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sessionsThisWeek = history.filter((h) => h.startedAt.getTime() >= weekAgo).length;
  await dispatchNotification(weeklySummaryTemplate(sessionsThisWeek), userId);
}

export async function notificationScheduling(userId: string, exerciseName?: string): Promise<void> {
  await dispatchNotification(workoutReminderTemplate(exerciseName), userId);
}

/** Infra hygiene sweep — cache/rate-limiter data structures already
 *  self-trim (see cache/memory-cache.ts's lazy expiry, rate-limiter's
 *  sweep()); this reports current sizes rather than force-clearing
 *  anything, since there's no persistent store yet whose rows would need
 *  pruning (see ALGORITHM.md "Known limitations"). */
export async function cleanup(): Promise<{ queues: ReturnType<typeof listQueues>; rateLimiter: ReturnType<typeof rateLimiterSnapshot> }> {
  const report = { queues: listQueues(), rateLimiter: rateLimiterSnapshot() };
  logger.info("cleanup sweep", report);
  return report;
}
