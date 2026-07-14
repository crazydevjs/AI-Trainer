import type { ExperimentResult } from "../experiments";

export interface FeatureImpactReport {
  experimentId: string;
  metricKey: string;
  control: ExperimentResult | null;
  treatment: ExperimentResult | null;
  /** null when either side lacks data — never a fabricated delta. */
  deltaPerThousandUsers: number | null;
}
