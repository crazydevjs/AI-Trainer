import { promises as fs } from "fs";
import path from "path";
import { COMPONENT_NAMES } from "./types";
import type { ComponentName, ComponentVersionRecord, ModelRegistrySnapshot } from "./types";

const ROOT = path.join(process.cwd(), ".data", "mlops", "model-registry");
const CURRENT_FILE = path.join(ROOT, "current.json");
const HISTORY_FILE = path.join(ROOT, "history.jsonl");

function seedSnapshot(): ModelRegistrySnapshot {
  const now = Date.now();
  const snapshot = {} as ModelRegistrySnapshot;
  for (const component of COMPONENT_NAMES) {
    snapshot[component] = { component, version: "1.0.0", updatedAt: now, notes: "seeded baseline" };
  }
  return snapshot;
}

export async function getCurrentVersions(): Promise<ModelRegistrySnapshot> {
  try {
    return JSON.parse(await fs.readFile(CURRENT_FILE, "utf-8")) as ModelRegistrySnapshot;
  } catch {
    const seeded = seedSnapshot();
    await fs.mkdir(ROOT, { recursive: true });
    await fs.writeFile(CURRENT_FILE, JSON.stringify(seeded, null, 2));
    return seeded;
  }
}

export async function setComponentVersion(
  component: ComponentName,
  version: string,
  options: { updatedBy?: string; notes?: string } = {},
): Promise<ComponentVersionRecord> {
  const snapshot = await getCurrentVersions();
  const record: ComponentVersionRecord = {
    component,
    version,
    updatedAt: Date.now(),
    updatedBy: options.updatedBy,
    notes: options.notes,
  };
  snapshot[component] = record;

  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(CURRENT_FILE, JSON.stringify(snapshot, null, 2));
  await fs.appendFile(HISTORY_FILE, `${JSON.stringify(record)}\n`);

  return record;
}

export async function getComponentHistory(component: ComponentName): Promise<ComponentVersionRecord[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ComponentVersionRecord)
      .filter((r) => r.component === component)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}
