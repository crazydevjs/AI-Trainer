import { createHash } from "crypto";
import type { Dataset } from "@/lib/validation/dataset";

/** Deterministic checksum over a dataset's entries — sorted by id first,
 *  since `saveDataset()`/`loadDataset()` don't guarantee read-back order
 *  (entries are written as separate files and re-read via `readdir`). */
export function computeDatasetChecksum(dataset: Dataset): string {
  const sorted = [...dataset.entries].sort((a, b) => a.id.localeCompare(b.id));
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}
