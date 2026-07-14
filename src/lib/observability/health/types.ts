export type ComponentStatus = "ok" | "degraded" | "down" | "not-configured";

export interface HealthComponent {
  name: string;
  status: ComponentStatus;
  detail: string;
}

export interface HealthScoreReport {
  score: number; // 0-100
  status: "healthy" | "degraded" | "down";
  components: HealthComponent[];
  generatedAt: number;
}
