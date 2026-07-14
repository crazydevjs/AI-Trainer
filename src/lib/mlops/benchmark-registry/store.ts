import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { BenchmarkRun } from "./types";

const ROOT = path.join(process.cwd(), ".data", "mlops", "benchmark-registry");

export async function saveBenchmarkRun(input: Omit<BenchmarkRun, "id" | "createdAt">): Promise<BenchmarkRun> {
  const run: BenchmarkRun = { ...input, id: randomUUID(), createdAt: Date.now() };
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${run.id}.json`), JSON.stringify(run, null, 2));
  return run;
}

export async function listBenchmarkRuns(): Promise<BenchmarkRun[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const runs = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    return (runs as BenchmarkRun[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function getLatestBenchmarkRun(datasetName: string): Promise<BenchmarkRun | null> {
  const runs = await listBenchmarkRuns();
  return runs.find((r) => r.datasetName === datasetName) ?? null;
}
