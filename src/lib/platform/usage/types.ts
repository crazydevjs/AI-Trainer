export type UsageMetric =
  | "aiRequests"
  | "workoutSessions"
  | "uploads"
  | "storageBytes"
  | "apiCalls"
  | "streamingTokens";

export interface UsageSnapshot {
  userId: string;
  month: string;
  usage: Record<UsageMetric, number>;
}

export interface QuotaCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
}
