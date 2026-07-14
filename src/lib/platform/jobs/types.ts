export type JobName =
  | "weeklyReview"
  | "monthlyReview"
  | "achievementGeneration"
  | "progressPredictionRefresh"
  | "emailGeneration"
  | "notificationScheduling"
  | "cleanup";

export interface JobResult {
  job: JobName;
  userId?: string;
  ranAt: number;
  durationMs: number;
  ok: boolean;
  error?: string;
}
