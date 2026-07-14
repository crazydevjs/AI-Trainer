import { promises as fs } from "fs";
import path from "path";
import type { ReleaseCandidate } from "./types";

const ROOT = path.join(process.cwd(), ".data", "mlops", "releases");

export async function saveRelease(release: ReleaseCandidate): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${release.id}.json`), JSON.stringify(release, null, 2));
}

export async function getRelease(id: string): Promise<ReleaseCandidate | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, `${id}.json`), "utf-8")) as ReleaseCandidate;
  } catch {
    return null;
  }
}

export async function listReleases(): Promise<ReleaseCandidate[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const releases = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    return (releases as ReleaseCandidate[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}
