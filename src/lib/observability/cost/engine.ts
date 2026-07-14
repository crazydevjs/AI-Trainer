import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getUsageSnapshot } from "@/lib/platform/usage";
import { PRICING } from "./pricing";
import type { CostLineItem, CostReport } from "./types";

const STORAGE_ROOT = path.join(process.cwd(), ".data", "storage");

/** Real disk usage under the local storage provider's root (Phase 11) —
 *  there's no `StorageProvider.listAll()` method, so this walks the same
 *  directory convention directly rather than adding one just for this. */
async function getStorageBytes(): Promise<number> {
  async function walk(dir: string): Promise<number> {
    let total = 0;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return 0;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      total += entry.isDirectory() ? await walk(full) : (await fs.stat(full)).size;
    }
    return total;
  }
  return walk(STORAGE_ROOT);
}

function cutoffDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Aggregates Phase 11's per-user `usage/` counters across every user —
 *  that module only exposes a per-user snapshot, so this is the "sum
 *  across the whole platform" most cost reporting actually needs. */
async function getPlatformUsageTotals(): Promise<{ streamingTokens: number; apiCalls: number }> {
  const users = await prisma.user.findMany({ select: { id: true } });
  let streamingTokens = 0;
  let apiCalls = 0;
  for (const { id } of users) {
    const snapshot = getUsageSnapshot(id);
    streamingTokens += snapshot.usage.streamingTokens;
    apiCalls += snapshot.usage.apiCalls;
  }
  return { streamingTokens, apiCalls };
}

export async function computeCostReport(days = 30): Promise<CostReport> {
  const [{ streamingTokens, apiCalls }, storageBytes, totalUsers, totalWorkouts] = await Promise.all([
    getPlatformUsageTotals(),
    getStorageBytes(),
    prisma.user.count(),
    prisma.workoutSession.count({ where: { startedAt: { gte: cutoffDate(days) } } }),
  ]);

  const storageGb = storageBytes / 1024 ** 3;
  const lineItems: CostLineItem[] = [
    {
      category: "llm",
      amountUsd: (streamingTokens / 1000) * PRICING.llmPerThousandTokensUsd,
      basis:
        streamingTokens > 0
          ? `${streamingTokens} tracked streaming tokens (Phase 11 usage/) — estimated rate`
          : "$0 — no LLM provider integrated yet (src/lib/coach.ts is fully local/offline)",
    },
    {
      category: "storage",
      amountUsd: storageGb * PRICING.storagePerGbMonthUsd,
      basis: `${storageGb.toFixed(4)} GB measured on local disk under .data/storage — estimated rate`,
    },
    {
      category: "bandwidth",
      amountUsd: 0,
      basis: "$0 — no bandwidth/CDN metering exists anywhere in this app yet",
    },
    {
      category: "compute",
      amountUsd: apiCalls * PRICING.computePerApiCallUsd,
      basis: `${apiCalls} tracked API calls (Phase 11 usage/) — rough per-invocation estimate`,
    },
  ];

  const totalUsd = lineItems.reduce((sum, item) => sum + item.amountUsd, 0);

  return {
    lineItems,
    totalUsd,
    costPerWorkout: totalWorkouts ? totalUsd / totalWorkouts : 0,
    costPerUser: totalUsers ? totalUsd / totalUsers : 0,
    monthlyProjection: (totalUsd / days) * 30,
    windowDays: days,
  };
}
