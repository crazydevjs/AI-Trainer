import { promises as fs } from "fs";
import path from "path";
import type { GoldenDataset } from "./types";

const FILE = path.join(process.cwd(), ".data", "mlops", "golden-datasets", "registry.json");

export async function listGoldenDatasets(): Promise<GoldenDataset[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf-8")) as GoldenDataset[];
  } catch {
    return [];
  }
}

export async function saveGoldenDataset(golden: GoldenDataset): Promise<void> {
  const all = await listGoldenDatasets();
  const withoutExisting = all.filter(
    (g) => !(g.name === golden.name && g.datasetVersion === golden.datasetVersion),
  );
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify([...withoutExisting, golden], null, 2));
}

export async function getGoldenDataset(name: string, datasetVersion: number): Promise<GoldenDataset | null> {
  const all = await listGoldenDatasets();
  return all.find((g) => g.name === name && g.datasetVersion === datasetVersion) ?? null;
}
