import { computeHealthScore } from "../health";
import { listExperimentDefinitions } from "../experiments";
import { listRollouts } from "../rollouts";
import { getLatencyDashboard } from "../latency";
import { computeCostReport } from "../cost";
import { listAlerts } from "../alerts";
import { listErrorGroups } from "../error-groups";
import { getActiveUserStats } from "../retention";
import { getOnboardingFunnel } from "../usage-analytics";
import type { ObservabilityStatus } from "./types";

const TOP_ERRORS_LIMIT = 10;
const RECENT_ALERTS_LIMIT = 10;

/** Backs the Developer dashboard's OBSERVABILITY panel — pulls current
 *  state from every other module in this tree in one call. Nothing here
 *  triggers a check or a run; `alerts:*`/`health:report` etc. do that,
 *  this only displays their most recent output. */
export async function getObservabilityStatus(): Promise<ObservabilityStatus> {
  const [health, experiments, rollouts, latency, cost, alerts, errorGroups, retention, featureUsage] =
    await Promise.all([
      computeHealthScore(),
      listExperimentDefinitions(),
      listRollouts(),
      getLatencyDashboard(),
      computeCostReport(),
      listAlerts(true),
      listErrorGroups(),
      getActiveUserStats(),
      getOnboardingFunnel(),
    ]);

  return {
    health,
    experiments,
    rollouts,
    latency,
    cost,
    alerts: alerts.slice(0, RECENT_ALERTS_LIMIT),
    topErrors: errorGroups.slice(0, TOP_ERRORS_LIMIT),
    retention,
    featureUsage,
  };
}
