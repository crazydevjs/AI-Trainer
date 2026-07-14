import { getExperimentDefinition, computeExperimentResults } from "../experiments";
import type { FeatureImpactReport } from "./types";

/** Reuses `experiments/`'s control-vs-treatment comparison rather than a
 *  naive before/after time comparison — a real A/B split isn't confounded
 *  by whatever else changed over time, unlike comparing "last month" to
 *  "this month." Expresses the delta as "per 1000 users" since a raw
 *  mean-of-means difference (e.g. "+0.02 completion rate") is hard to
 *  reason about at a glance. */
export async function computeFeatureImpact(
  experimentId: string,
  controlVariant = "control",
  treatmentVariant = "treatment",
): Promise<FeatureImpactReport> {
  const definition = await getExperimentDefinition(experimentId);
  if (!definition) throw new Error(`Experiment "${experimentId}" not found`);

  const results = await computeExperimentResults(experimentId);
  const control = results.find((r) => r.variant === controlVariant) ?? null;
  const treatment = results.find((r) => r.variant === treatmentVariant) ?? null;

  return {
    experimentId,
    metricKey: definition.metricKey,
    control,
    treatment,
    deltaPerThousandUsers: control && treatment ? (treatment.mean - control.mean) * 1000 : null,
  };
}
