export type RolloutStatus = "active" | "paused" | "rolled-back" | "completed";

export interface Rollout {
  id: string;
  flagKey: string;
  stages: number[]; // ascending rollout percentages, e.g. [10, 25, 50, 100]
  currentStageIndex: number;
  status: RolloutStatus;
  createdAt: number;
  updatedAt: number;
}
