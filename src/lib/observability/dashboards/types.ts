import type { HealthScoreReport } from "../health";
import type { ExperimentDefinition } from "../experiments";
import type { Rollout } from "../rollouts";
import type { LatencyDashboard } from "../latency";
import type { CostReport } from "../cost";
import type { Alert } from "../alerts";
import type { ErrorGroup } from "../error-groups";
import type { ActiveUserStats } from "../retention";
import type { FunnelStage } from "../usage-analytics";

export interface ObservabilityStatus {
  health: HealthScoreReport;
  experiments: ExperimentDefinition[];
  rollouts: Rollout[];
  latency: LatencyDashboard;
  cost: CostReport;
  alerts: Alert[];
  topErrors: ErrorGroup[];
  retention: ActiveUserStats;
  featureUsage: FunnelStage[];
}
