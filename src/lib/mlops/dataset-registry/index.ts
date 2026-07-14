import { loadDataset } from "@/lib/validation/dataset";
import { listGroundTruthLabels } from "@/lib/validation/ground-truth";
import { computeCoverageReport } from "./registry";
import type { DatasetCoverageReport } from "./types";

export type { DatasetCoverageReport } from "./types";
export { computeCoverageReport } from "./registry";

/** Loads a dataset (Phase 12) + every ground-truth label on disk and
 *  computes its coverage report in one call — the convenience entry
 *  point for the CLI and dashboard. Recomputed live each time (coverage
 *  reports are cheap — a handful of tallies over a dataset's entries),
 *  not cached, so it's never stale. */
export async function getDatasetRegistryEntry(
  name: string,
  version?: number,
): Promise<DatasetCoverageReport | null> {
  const dataset = await loadDataset(name, version);
  if (!dataset) return null;

  const labels = await listGroundTruthLabels();
  const groundTruthBySessionId = new Map(labels.map((l) => [l.sessionId, l]));
  return computeCoverageReport(dataset, groundTruthBySessionId);
}
