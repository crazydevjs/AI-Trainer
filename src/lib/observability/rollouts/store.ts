import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Rollout } from "./types";

const ROOT = path.join(process.cwd(), ".data", "observability", "rollouts");

export async function saveRollout(rollout: Rollout): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${rollout.id}.json`), JSON.stringify(rollout, null, 2));
}

export async function getRollout(id: string): Promise<Rollout | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, `${id}.json`), "utf-8")) as Rollout;
  } catch {
    return null;
  }
}

export async function listRollouts(): Promise<Rollout[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const rollouts = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    return (rollouts as Rollout[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function newRolloutId(): string {
  return randomUUID();
}
