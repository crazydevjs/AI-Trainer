export type HealthStatus = "ok" | "degraded" | "down";

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  message?: string;
}

export interface HealthReport {
  status: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: number;
}

export type LogLevel = "debug" | "info" | "warn" | "error";
