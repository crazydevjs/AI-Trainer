import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ReviewItem, ReviewStatus } from "./types";

const ROOT = path.join(process.cwd(), ".data", "mlops", "human-review");

export async function saveReviewItem(item: ReviewItem): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${item.id}.json`), JSON.stringify(item, null, 2));
}

export async function getReviewItem(id: string): Promise<ReviewItem | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, `${id}.json`), "utf-8")) as ReviewItem;
  } catch {
    return null;
  }
}

export async function listReviewItems(status?: ReviewStatus): Promise<ReviewItem[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const items = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    const all = (items as ReviewItem[]).sort((a, b) => b.createdAt - a.createdAt);
    return status ? all.filter((i) => i.status === status) : all;
  } catch {
    return [];
  }
}

export function newReviewId(): string {
  return randomUUID();
}
