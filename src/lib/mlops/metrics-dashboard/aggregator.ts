import { listDatasets, listDatasetVersions } from "@/lib/validation/dataset";
import { listExperiments } from "@/lib/validation/experiment";
import { getDatasetRegistryEntry } from "../dataset-registry";
import { listGoldenDatasets } from "../golden-datasets";
import { listBenchmarkRuns } from "../benchmark-registry";
import { listReleases } from "../release-manager";
import type { MlopsStatus } from "./types";

const RECENT_LIMIT = 10;

/** Backs the Developer dashboard's MLOPS panel — pulls the latest state
 *  from every other mlops/ module in one call. Every read is a handful of
 *  file-system reads or a dataset coverage recompute; safe to call on
 *  every dashboard load, never on a live-session path. */
export async function getMlopsStatus(): Promise<MlopsStatus> {
  const datasetNames = await listDatasets();
  const datasetCoverage = (
    await Promise.all(
      datasetNames.map(async (name) => {
        const versions = await listDatasetVersions(name);
        if (versions.length === 0) return null;
        return getDatasetRegistryEntry(name, Math.max(...versions));
      }),
    )
  ).filter((r): r is NonNullable<typeof r> => r != null);

  const releaseHistory = await listReleases();
  const regressionAlerts = releaseHistory.flatMap((r) => r.regressionSummary?.alerts ?? []);
  const driftAlerts = releaseHistory.flatMap((r) => r.evaluation?.driftReports.filter((d) => d.severity !== "none") ?? []);
  const latestReleaseQualityScore = releaseHistory.find((r) => r.qualityScore != null)?.qualityScore ?? null;

  return {
    datasetCoverage,
    goldenDatasets: await listGoldenDatasets(),
    benchmarkHistory: (await listBenchmarkRuns()).slice(0, RECENT_LIMIT),
    experimentHistory: (await listExperiments()).slice(0, RECENT_LIMIT),
    releaseHistory: releaseHistory.slice(0, RECENT_LIMIT),
    regressionAlerts: regressionAlerts.slice(0, RECENT_LIMIT),
    driftAlerts: driftAlerts.slice(0, RECENT_LIMIT),
    latestReleaseQualityScore,
  };
}
