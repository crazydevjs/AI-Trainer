import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Experiment } from "./types";

const ROOT = path.join(process.cwd(), ".data", "validation", "experiments");

export async function saveExperiment(input: Omit<Experiment, "id" | "date">): Promise<Experiment> {
  const experiment: Experiment = { ...input, id: randomUUID(), date: Date.now() };
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${experiment.id}.json`), JSON.stringify(experiment, null, 2));
  return experiment;
}

export async function listExperiments(): Promise<Experiment[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const experiments = await Promise.all(
      files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))),
    );
    return (experiments as Experiment[]).sort((a, b) => b.date - a.date);
  } catch {
    return [];
  }
}

export async function getExperiment(id: string): Promise<Experiment | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, `${id}.json`), "utf-8")) as Experiment;
  } catch {
    return null;
  }
}
