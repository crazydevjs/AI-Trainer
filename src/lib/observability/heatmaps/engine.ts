import { prisma } from "@/lib/prisma";
import type { HeatmapCell } from "./types";

/** Real usage heatmap from `WorkoutSession.startedAt` — when do people
 *  actually train. Server-local time (no per-user timezone stored
 *  anywhere in the schema, so this can't be normalized to each user's
 *  own clock — a known simplification). */
export async function getUsageHeatmap(days = 90): Promise<HeatmapCell[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sessions = await prisma.workoutSession.findMany({
    where: { startedAt: { gte: cutoff } },
    select: { startedAt: true },
  });

  const counts = new Map<string, number>();
  for (const s of sessions) {
    const key = `${s.startedAt.getDay()}:${s.startedAt.getHours()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const cells: HeatmapCell[] = [];
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = counts.get(`${dayOfWeek}:${hour}`) ?? 0;
      if (count > 0) cells.push({ dayOfWeek, hour, count });
    }
  }
  return cells;
}
