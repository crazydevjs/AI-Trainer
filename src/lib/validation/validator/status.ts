import { listDatasets, listDatasetVersions, loadDataset } from "../dataset";
import { listExperiments, type Experiment } from "../experiment";
import { loadLatestReport, type LatestReportPointer } from "./store";

export interface DatasetCoverage {
  name: string;
  version: number;
  sessionCount: number;
  labeledCount: number;
  exercises: string[];
}

export interface ValidationStatus {
  datasets: DatasetCoverage[];
  recentExperiments: Experiment[];
  regressionAlerts: Experiment[];
  latestReport: LatestReportPointer | null;
}

const RECENT_LIMIT = 10;

/** Backs the Developer dashboard's VALIDATION panel — everything here is
 *  a handful of small file reads, safe to call on every dashboard load. */
export async function getValidationStatus(): Promise<ValidationStatus> {
  const datasetNames = await listDatasets();

  const datasets: DatasetCoverage[] = [];
  for (const name of datasetNames) {
    const versions = await listDatasetVersions(name);
    if (versions.length === 0) continue;
    const latestVersion = Math.max(...versions);
    const dataset = await loadDataset(name, latestVersion);
    if (!dataset) continue;
    datasets.push({
      name,
      version: latestVersion,
      sessionCount: dataset.manifest.entryCount,
      labeledCount: dataset.manifest.labeledCount,
      exercises: dataset.manifest.exercises,
    });
  }

  const experiments = await listExperiments();

  return {
    datasets,
    recentExperiments: experiments.slice(0, RECENT_LIMIT),
    regressionAlerts: experiments.filter((e) => e.regressionDetected).slice(0, RECENT_LIMIT),
    latestReport: await loadLatestReport(),
  };
}
