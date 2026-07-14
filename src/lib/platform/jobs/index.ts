import { jobScheduler, runForAllUsers } from "./scheduler";
import * as jobDefinitions from "./definitions";

export type { JobName, JobResult } from "./types";
export { jobScheduler, runForAllUsers } from "./scheduler";
export { jobDefinitions };

const DAY = 24 * 60 * 60 * 1000;

// Registering only makes the job known to the scheduler (and visible in
// the Developer dashboard's Job Metrics panel) — it does not start any
// timer. See scheduler.ts for why `start()` is a separate, explicit step.
jobScheduler.register("weeklyReview", 7 * DAY, () => runForAllUsers(jobDefinitions.weeklyReview));
jobScheduler.register("monthlyReview", 30 * DAY, () => runForAllUsers(jobDefinitions.monthlyReview));
jobScheduler.register("achievementGeneration", DAY, () =>
  runForAllUsers(async (userId) => {
    await jobDefinitions.achievementGeneration(userId);
  }),
);
jobScheduler.register("progressPredictionRefresh", DAY, () =>
  runForAllUsers(async (userId) => {
    await jobDefinitions.progressPredictionRefresh(userId);
  }),
);
jobScheduler.register("emailGeneration", 7 * DAY, () => runForAllUsers(jobDefinitions.emailGeneration));
jobScheduler.register("notificationScheduling", DAY, () =>
  runForAllUsers((userId) => jobDefinitions.notificationScheduling(userId)),
);
jobScheduler.register("cleanup", 60 * 60 * 1000, async () => {
  await jobDefinitions.cleanup();
});
