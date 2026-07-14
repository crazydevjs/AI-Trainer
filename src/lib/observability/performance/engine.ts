import { mean } from "@/lib/validation/statistics";
import { listDatasets, listDatasetVersions, loadDataset } from "@/lib/validation/dataset";
import type { ClientPerformanceSnapshot } from "./types";

const EMPTY: ClientPerformanceSnapshot = {
  datasetName: null,
  datasetVersion: null,
  sessionsAnalyzed: 0,
  avgFps: null,
  avgInferenceMs: null,
  deviceTierDistribution: {},
};

export async function getClientPerformanceSnapshot(datasetName?: string): Promise<ClientPerformanceSnapshot> {
  let name = datasetName;
  if (!name) {
    const names = await listDatasets();
    name = names[0];
  }
  if (!name) return EMPTY;

  const versions = await listDatasetVersions(name);
  if (versions.length === 0) return EMPTY;

  const dataset = await loadDataset(name, Math.max(...versions));
  if (!dataset) return EMPTY;

  const fpsValues: number[] = [];
  const inferenceValues: number[] = [];
  const deviceTierDistribution: Record<string, number> = {};

  for (const entry of dataset.entries) {
    const tier = entry.session.meta.deviceTier as string | undefined;
    if (tier) deviceTierDistribution[tier] = (deviceTierDistribution[tier] ?? 0) + 1;

    for (const log of entry.session.log) {
      if (log.event !== "sample") continue;
      if (typeof log.fps === "number") fpsValues.push(log.fps);
      if (typeof log.inferenceMs === "number") inferenceValues.push(log.inferenceMs);
    }
  }

  return {
    datasetName: dataset.manifest.name,
    datasetVersion: dataset.manifest.version,
    sessionsAnalyzed: dataset.entries.length,
    avgFps: fpsValues.length ? mean(fpsValues) : null,
    avgInferenceMs: inferenceValues.length ? mean(inferenceValues) : null,
    deviceTierDistribution,
  };
}
