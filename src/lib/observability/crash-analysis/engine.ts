import { listErrorOccurrences } from "../error-groups";

export interface CrashFrequencyBucket {
  date: string; // YYYY-MM-DD
  count: number;
}

/** "Crash" here means a client-side error reported via
 *  `POST /api/observability/errors` (wired into `error.tsx`/
 *  `global-error.tsx`) — not a server process crash, which this app has
 *  no mechanism to detect or report today. */
export async function getCrashFrequency(days = 7): Promise<CrashFrequencyBucket[]> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const occurrences = await listErrorOccurrences();

  const counts = new Map<string, number>();
  for (const occurrence of occurrences) {
    if (occurrence.kind !== "client" || occurrence.timestamp < cutoff) continue;
    const date = new Date(occurrence.timestamp).toISOString().slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return [...counts.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTotalCrashCount(days = 7): Promise<number> {
  const buckets = await getCrashFrequency(days);
  return buckets.reduce((sum, b) => sum + b.count, 0);
}
