import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { nextDatasetVersion } from "./store";
import type { Dataset, DatasetEntry, LabeledSession } from "./types";

export async function createDataset(name: string): Promise<Dataset> {
  const version = await nextDatasetVersion(name);
  return {
    manifest: { name, version, createdAt: Date.now(), entryCount: 0, labeledCount: 0, exercises: [] },
    entries: [],
  };
}

function refreshManifest(dataset: Dataset): void {
  dataset.manifest.entryCount = dataset.entries.length;
  dataset.manifest.labeledCount = dataset.entries.filter((e) => e.groundTruthId != null).length;
  dataset.manifest.exercises = [...new Set(dataset.entries.map((e) => e.session.meta.exerciseSlug))];
}

export function addSession(dataset: Dataset, session: LabeledSession, groundTruthId: string | null = null): DatasetEntry {
  const entry: DatasetEntry = { id: randomUUID(), session, groundTruthId, addedAt: Date.now() };
  dataset.entries.push(entry);
  refreshManifest(dataset);
  return entry;
}

export function attachGroundTruth(dataset: Dataset, entryId: string, groundTruthId: string): void {
  const entry = dataset.entries.find((e) => e.id === entryId);
  if (!entry) throw new Error(`No dataset entry with id ${entryId}`);
  entry.groundTruthId = groundTruthId;
  refreshManifest(dataset);
}

/** Reads a debug-export JSON file (the same file a developer downloads
 *  from the live Dev HUD's export button) from disk. Only checks the
 *  handful of fields this framework actually reads — the export's full
 *  shape isn't a formally shared type (it's assembled ad hoc in
 *  `session-report.tsx`), so this stays defensive rather than asserting a
 *  schema session-report.tsx doesn't itself guarantee. */
export async function loadSessionFromFile(filePath: string): Promise<LabeledSession> {
  const raw = JSON.parse(await fs.readFile(filePath, "utf-8"));
  if (!raw?.meta?.sessionId || !raw?.summary || !Array.isArray(raw?.log)) {
    throw new Error(`${filePath} doesn't look like a FORGE debug export (missing meta/summary/log)`);
  }
  return raw as LabeledSession;
}
