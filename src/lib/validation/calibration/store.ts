import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ThresholdSetVersion } from "./types";

const ROOT = path.join(process.cwd(), ".data", "validation", "calibration");

function dirFor(poseKey: string): string {
  return path.join(ROOT, encodeURIComponent(poseKey));
}
function activePointerFile(poseKey: string): string {
  return path.join(dirFor(poseKey), "_active.json");
}

export async function saveThresholdVersion(
  version: Omit<ThresholdSetVersion, "id" | "createdAt">,
): Promise<ThresholdSetVersion> {
  const full: ThresholdSetVersion = { ...version, id: randomUUID(), createdAt: Date.now() };
  await fs.mkdir(dirFor(version.poseKey), { recursive: true });
  await fs.writeFile(path.join(dirFor(version.poseKey), `${full.id}.json`), JSON.stringify(full, null, 2));
  return full;
}

export async function listThresholdVersions(poseKey: string): Promise<ThresholdSetVersion[]> {
  try {
    const files = (await fs.readdir(dirFor(poseKey))).filter((f) => f.endsWith(".json") && f !== "_active.json");
    const versions = await Promise.all(
      files.map(async (f) => JSON.parse(await fs.readFile(path.join(dirFor(poseKey), f), "utf-8"))),
    );
    return (versions as ThresholdSetVersion[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** Sets which version this framework currently treats as "the candidate
 *  under test" for a pose key. Rollback is the same operation — pointing
 *  back at an earlier version's id. Never writes to `exercises.ts`. */
export async function setActiveVersion(poseKey: string, versionId: string): Promise<void> {
  await fs.mkdir(dirFor(poseKey), { recursive: true });
  await fs.writeFile(activePointerFile(poseKey), JSON.stringify({ versionId }, null, 2));
}

export async function getActiveVersion(poseKey: string): Promise<ThresholdSetVersion | null> {
  try {
    const { versionId } = JSON.parse(await fs.readFile(activePointerFile(poseKey), "utf-8"));
    const versions = await listThresholdVersions(poseKey);
    return versions.find((v) => v.id === versionId) ?? null;
  } catch {
    return null;
  }
}
