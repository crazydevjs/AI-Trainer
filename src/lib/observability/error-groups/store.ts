import { promises as fs } from "fs";
import path from "path";
import { computeFingerprint } from "./fingerprint";
import type { ErrorGroup, ErrorKind, ErrorOccurrence } from "./types";

const ROOT = path.join(process.cwd(), ".data", "observability", "error-groups");
const OCCURRENCES_FILE = path.join(ROOT, "occurrences.jsonl");

function groupFile(fingerprint: string): string {
  return path.join(ROOT, `${fingerprint}.json`);
}

export async function recordError(input: { message: string; stack?: string; kind: ErrorKind }): Promise<ErrorGroup> {
  const fingerprint = computeFingerprint(input.message, input.stack);
  await fs.mkdir(ROOT, { recursive: true });

  const now = Date.now();
  let group: ErrorGroup;
  try {
    const existing = JSON.parse(await fs.readFile(groupFile(fingerprint), "utf-8")) as ErrorGroup;
    group = { ...existing, lastSeenAt: now, count: existing.count + 1 };
  } catch {
    group = {
      fingerprint,
      message: input.message,
      kind: input.kind,
      firstSeenAt: now,
      lastSeenAt: now,
      count: 1,
      sampleStack: input.stack,
    };
  }
  await fs.writeFile(groupFile(fingerprint), JSON.stringify(group, null, 2));

  const occurrence: ErrorOccurrence = { fingerprint, kind: input.kind, timestamp: now };
  await fs.appendFile(OCCURRENCES_FILE, `${JSON.stringify(occurrence)}\n`);

  return group;
}

export async function listErrorGroups(): Promise<ErrorGroup[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const groups = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    return (groups as ErrorGroup[]).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  } catch {
    return [];
  }
}

export async function listErrorOccurrences(): Promise<ErrorOccurrence[]> {
  try {
    const raw = await fs.readFile(OCCURRENCES_FILE, "utf-8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ErrorOccurrence);
  } catch {
    return [];
  }
}
