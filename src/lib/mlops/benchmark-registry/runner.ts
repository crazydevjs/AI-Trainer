import { runFullValidation } from "@/lib/validation/validator";
import { getCurrentVersions } from "../model-registry";
import { saveBenchmarkRun } from "./store";
import type { BenchmarkRun } from "./types";

/** Runs Phase 12's full validation (which persists its own JSON/Markdown
 *  report artifacts) and additionally records the result here, snapshotted
 *  against the model registry's current versions — so a later regression
 *  check can say "this benchmark ran against repEngine 1.2.0, not just
 *  some report file with a timestamp." */
export async function recordBenchmarkRun(datasetName: string, datasetVersion?: number): Promise<BenchmarkRun> {
  const reports = await runFullValidation(datasetName, datasetVersion, ["json"]);
  const modelVersions = await getCurrentVersions();

  return saveBenchmarkRun({
    datasetName,
    datasetVersion: datasetVersion ?? reports[0]?.datasetVersion ?? 0,
    modelVersions,
    reports,
  });
}
