export type AlertKind =
  | "regression"
  | "latency"
  | "cost-spike"
  | "provider-outage"
  | "crash-spike"
  | "queue-failure"
  | "storage-failure";

export type AlertSeverity = "critical" | "warning";

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
  firedAt: number;
  resolved: boolean;
}
