import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ExperimentDefinition, ExperimentOutcome } from "./types";

const ROOT = path.join(process.cwd(), ".data", "observability", "experiments");
const OUTCOMES_FILE = path.join(ROOT, "outcomes.jsonl");

export async function saveExperimentDefinition(
  input: Omit<ExperimentDefinition, "id" | "createdAt" | "status" | "startedAt" | "endedAt" | "winner">,
): Promise<ExperimentDefinition> {
  const definition: ExperimentDefinition = {
    ...input,
    id: randomUUID(),
    status: "draft",
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    winner: null,
  };
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${definition.id}.json`), JSON.stringify(definition, null, 2));
  return definition;
}

export async function updateExperimentDefinition(definition: ExperimentDefinition): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${definition.id}.json`), JSON.stringify(definition, null, 2));
}

export async function getExperimentDefinition(id: string): Promise<ExperimentDefinition | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, `${id}.json`), "utf-8")) as ExperimentDefinition;
  } catch {
    return null;
  }
}

export async function listExperimentDefinitions(): Promise<ExperimentDefinition[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const defs = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    return (defs as ExperimentDefinition[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function recordOutcome(outcome: ExperimentOutcome): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.appendFile(OUTCOMES_FILE, `${JSON.stringify(outcome)}\n`);
}

export async function listOutcomes(experimentId: string): Promise<ExperimentOutcome[]> {
  try {
    const raw = await fs.readFile(OUTCOMES_FILE, "utf-8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ExperimentOutcome)
      .filter((o) => o.experimentId === experimentId);
  } catch {
    return [];
  }
}
