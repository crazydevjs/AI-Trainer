import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { FeedbackEntry, FeedbackStatus, FeedbackType } from "./types";

const ROOT = path.join(process.cwd(), ".data", "mlops", "feedback");

export async function submitFeedback(input: {
  userId: string;
  sessionId?: string;
  exerciseSlug?: string;
  type: FeedbackType;
  description: string;
}): Promise<FeedbackEntry> {
  const entry: FeedbackEntry = { ...input, id: randomUUID(), createdAt: Date.now(), status: "new" };
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${entry.id}.json`), JSON.stringify(entry, null, 2));
  return entry;
}

export async function getFeedback(id: string): Promise<FeedbackEntry | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, `${id}.json`), "utf-8")) as FeedbackEntry;
  } catch {
    return null;
  }
}

export async function saveFeedback(entry: FeedbackEntry): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${entry.id}.json`), JSON.stringify(entry, null, 2));
}

export async function listFeedback(status?: FeedbackStatus): Promise<FeedbackEntry[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const entries = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    const all = (entries as FeedbackEntry[]).sort((a, b) => b.createdAt - a.createdAt);
    return status ? all.filter((e) => e.status === status) : all;
  } catch {
    return [];
  }
}
