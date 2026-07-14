import { loadDataset } from "@/lib/validation/dataset";
import { computeDatasetChecksum } from "./checksum";
import { saveGoldenDataset, getGoldenDataset } from "./store";
import type { GoldenDataset } from "./types";

/** Promotes a Phase 12 dataset version to "golden" — every release must
 *  pass against it. Promotion never copies or mutates the underlying
 *  dataset; "immutable" here means the checksum recorded at promotion
 *  time is the contract — `verifyGoldenChecksum()` is how drift/tampering
 *  after the fact gets caught, since the file-based dataset store has no
 *  hard write-lock mechanism. */
export async function promoteToGolden(
  datasetName: string,
  datasetVersion: number,
  options: { promotedBy?: string; notes?: string } = {},
): Promise<GoldenDataset> {
  const dataset = await loadDataset(datasetName, datasetVersion);
  if (!dataset) throw new Error(`Dataset "${datasetName}" v${datasetVersion} not found`);

  const golden: GoldenDataset = {
    name: datasetName,
    datasetVersion,
    checksum: computeDatasetChecksum(dataset),
    promotedAt: Date.now(),
    promotedBy: options.promotedBy,
    notes: options.notes,
  };
  await saveGoldenDataset(golden);
  return golden;
}

export async function verifyGoldenChecksum(name: string, datasetVersion: number): Promise<boolean> {
  const golden = await getGoldenDataset(name, datasetVersion);
  if (!golden) return false;

  const dataset = await loadDataset(name, datasetVersion);
  if (!dataset) return false;

  return computeDatasetChecksum(dataset) === golden.checksum;
}
