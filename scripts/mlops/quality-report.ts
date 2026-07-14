import { listDatasets, listDatasetVersions } from "@/lib/validation/dataset";
import { getDatasetRegistryEntry } from "@/lib/mlops/dataset-registry";
import { listReleases } from "@/lib/mlops/release-manager";

async function main() {
  console.log("\nDataset quality scores:");
  const names = await listDatasets();
  if (names.length === 0) console.log("  (no datasets yet)");
  for (const name of names) {
    const versions = await listDatasetVersions(name);
    const latest = Math.max(...versions);
    const report = await getDatasetRegistryEntry(name, latest);
    if (!report) continue;
    console.log(
      `  ${name} v${latest}: ${(report.qualityScore * 100).toFixed(0)}% ` +
        `(${report.labeledSessions}/${report.totalSessions} labeled)`,
    );
  }

  const releases = await listReleases();
  console.log("\nRelease quality scores:");
  if (releases.length === 0) console.log("  (no releases yet)");
  for (const release of releases.slice(0, 10)) {
    console.log(
      `  ${release.name} (${release.status}): ${((release.qualityScore ?? 0) * 100).toFixed(0)}% ` +
        `— ${new Date(release.createdAt).toLocaleDateString()}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
