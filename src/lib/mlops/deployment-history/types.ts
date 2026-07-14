export type DeploymentAction = "deployed" | "rolled-back";

export interface DeploymentEvent {
  id: string;
  releaseId: string;
  action: DeploymentAction;
  timestamp: number;
  actor?: string;
  notes?: string;
}
