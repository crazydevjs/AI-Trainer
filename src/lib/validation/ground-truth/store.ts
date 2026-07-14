import { promises as fs } from "fs";
import path from "path";
import type { GroundTruthLabel } from "./types";

const ROOT = path.join(process.cwd(), ".data", "validation", "ground-truth");

function fileFor(sessionId: string): string {
  // Ground truth is one label per session by design — re-importing a
  // label for the same session overwrites the previous one rather than
  // accumulating duplicates.
  return path.join(ROOT, `${encodeURIComponent(sessionId)}.json`);
}

export async function saveGroundTruthLabel(label: GroundTruthLabel): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(fileFor(label.sessionId), JSON.stringify(label, null, 2));
}

export async function saveGroundTruthLabels(labels: GroundTruthLabel[]): Promise<void> {
  await Promise.all(labels.map(saveGroundTruthLabel));
}

export async function loadGroundTruthLabel(sessionId: string): Promise<GroundTruthLabel | null> {
  try {
    return JSON.parse(await fs.readFile(fileFor(sessionId), "utf-8")) as GroundTruthLabel;
  } catch {
    return null;
  }
}

export async function listGroundTruthLabels(): Promise<GroundTruthLabel[]> {
  try {
    const files = await fs.readdir(ROOT);
    const labels = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map((f) => fs.readFile(path.join(ROOT, f), "utf-8")),
    );
    return labels.map((raw) => JSON.parse(raw) as GroundTruthLabel);
  } catch {
    return [];
  }
}
