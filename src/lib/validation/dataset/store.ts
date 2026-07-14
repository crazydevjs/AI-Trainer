import { promises as fs } from "fs";
import path from "path";
import type { Dataset, DatasetEntry } from "./types";

const ROOT = path.join(process.cwd(), ".data", "validation", "datasets");

function datasetDir(name: string, version: number): string {
  return path.join(ROOT, encodeURIComponent(name), `v${version}`);
}

export async function listDatasets(): Promise<string[]> {
  try {
    return (await fs.readdir(ROOT, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => decodeURIComponent(d.name));
  } catch {
    return [];
  }
}

export async function listDatasetVersions(name: string): Promise<number[]> {
  try {
    const dir = path.join(ROOT, encodeURIComponent(name));
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((d) => d.isDirectory() && /^v\d+$/.test(d.name))
      .map((d) => Number(d.name.slice(1)))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export async function nextDatasetVersion(name: string): Promise<number> {
  const versions = await listDatasetVersions(name);
  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  const dir = datasetDir(dataset.manifest.name, dataset.manifest.version);
  await fs.mkdir(path.join(dir, "entries"), { recursive: true });
  await fs.writeFile(path.join(dir, "manifest.json"), JSON.stringify(dataset.manifest, null, 2));
  await Promise.all(
    dataset.entries.map((entry) =>
      fs.writeFile(path.join(dir, "entries", `${entry.id}.json`), JSON.stringify(entry, null, 2)),
    ),
  );
}

export async function loadDataset(name: string, version?: number): Promise<Dataset | null> {
  const resolvedVersion = version ?? Math.max(...(await listDatasetVersions(name)), 0);
  if (!resolvedVersion) return null;

  const dir = datasetDir(name, resolvedVersion);
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "manifest.json"), "utf-8"));
    const entryFiles = (await fs.readdir(path.join(dir, "entries"))).filter((f) => f.endsWith(".json"));
    const entries: DatasetEntry[] = await Promise.all(
      entryFiles.map(async (f) => JSON.parse(await fs.readFile(path.join(dir, "entries", f), "utf-8"))),
    );
    return { manifest, entries };
  } catch {
    return null;
  }
}
