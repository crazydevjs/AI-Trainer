export type CostCategory = "llm" | "storage" | "bandwidth" | "compute";

export interface CostLineItem {
  category: CostCategory;
  amountUsd: number;
  basis: string;
}

export interface CostReport {
  lineItems: CostLineItem[];
  totalUsd: number;
  costPerWorkout: number;
  costPerUser: number;
  monthlyProjection: number;
  windowDays: number;
}
