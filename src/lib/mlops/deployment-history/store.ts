import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { DeploymentAction, DeploymentEvent } from "./types";

const FILE = path.join(process.cwd(), ".data", "mlops", "deployment-history", "log.jsonl");

async function append(releaseId: string, action: DeploymentAction, actor?: string, notes?: string): Promise<DeploymentEvent> {
  const event: DeploymentEvent = { id: randomUUID(), releaseId, action, timestamp: Date.now(), actor, notes };
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.appendFile(FILE, `${JSON.stringify(event)}\n`);
  return event;
}

export function recordDeployment(releaseId: string, actor?: string, notes?: string): Promise<DeploymentEvent> {
  return append(releaseId, "deployed", actor, notes);
}

export function recordRollback(releaseId: string, actor?: string, notes?: string): Promise<DeploymentEvent> {
  return append(releaseId, "rolled-back", actor, notes);
}

export async function listDeploymentHistory(): Promise<DeploymentEvent[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as DeploymentEvent)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

/** Walks the log in chronological order tracking which release is
 *  currently live — a "deployed" sets it, a "rolled-back" for that same
 *  release clears it — rather than just returning the most recent
 *  "deployed" event, which could itself have since been rolled back. */
export async function getLatestDeployedRelease(): Promise<DeploymentEvent | null> {
  const events = (await listDeploymentHistory()).sort((a, b) => a.timestamp - b.timestamp);

  let currentReleaseId: string | null = null;
  let currentEvent: DeploymentEvent | null = null;
  for (const event of events) {
    if (event.action === "deployed") {
      currentReleaseId = event.releaseId;
      currentEvent = event;
    } else if (event.action === "rolled-back" && event.releaseId === currentReleaseId) {
      currentReleaseId = null;
      currentEvent = null;
    }
  }
  return currentEvent;
}
