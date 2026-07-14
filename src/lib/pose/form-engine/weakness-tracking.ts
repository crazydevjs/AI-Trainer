// Cross-session recurring-issue tracking, device-local (localStorage) — same
// persistence pattern as calibration.ts/dev.ts. Not a diagnosis: just a tally
// of which non-minor issues keep showing up for a given exercise, so future
// coaching/HUD can say "this keeps happening" instead of treating every
// session as a blank slate. Server-side (cross-device) persistence is a
// Phase 5 candidate — see docs/ROADMAP.md.

import type { IssueId, IssueLogEntry, WeaknessTrend } from "./types";

const KEY = "forge:form-weaknesses";

interface WeaknessStore {
  [poseKey: string]: {
    [issueId: string]: { count: number; lastSeenAt: number };
  };
}

function load(): WeaknessStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WeaknessStore) : {};
  } catch {
    return {};
  }
}

function save(store: WeaknessStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable/full — weakness tracking is best-effort only.
  }
}

export function recordSessionIssues(poseKey: string | null, issueLog: IssueLogEntry[]) {
  if (!poseKey || !issueLog.length) return;
  const store = load();
  const bucket = store[poseKey] ?? {};
  for (const entry of issueLog) {
    if (entry.severity === "minor") continue;
    const prev = bucket[entry.id] ?? { count: 0, lastSeenAt: 0 };
    bucket[entry.id] = { count: prev.count + 1, lastSeenAt: entry.firstSeenAt };
  }
  store[poseKey] = bucket;
  save(store);
}

export function getWeaknessTrends(poseKey: string | null, limit = 5): WeaknessTrend[] {
  if (!poseKey) return [];
  const bucket = load()[poseKey];
  if (!bucket) return [];
  return Object.entries(bucket)
    .map(([id, v]) => ({ id: id as IssueId, count: v.count, lastSeenAt: v.lastSeenAt }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
