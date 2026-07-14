// Reconciles server-side WeaknessHistory after each session — the durable,
// cross-device counterpart to the Form Engine's own localStorage-only
// weakness tracking (see form-engine/weakness-tracking.ts). Reads only the
// already-computed issueLog/compensation events handed in by the API
// route; never touches pose data or the runtime engines' internals.

import { findWeakness, upsertWeakness } from "./performance-store";
import type { PerformanceEngineSessionInput, ProgressTrend, WeaknessUpdate } from "./types";

function classifyWeaknessTrend(prevFrequency: number, newFrequency: number): ProgressTrend {
  if (newFrequency > prevFrequency) return "declining"; // recurring more often = getting worse
  if (prevFrequency > 0 && newFrequency <= prevFrequency) return "improving";
  return "stable";
}

export async function updateWeaknessHistory(input: PerformanceEngineSessionInput): Promise<WeaknessUpdate[]> {
  const updates: WeaknessUpdate[] = [];
  const now = new Date();

  const formIssues = (input.formAnalysis?.issueLog ?? []).filter((e) => e.severity !== "minor");
  for (const issue of formIssues) {
    const existing = await findWeakness(input.userId, input.exerciseId, issue.id);
    const frequency = (existing?.frequency ?? 0) + 1;
    const trend = classifyWeaknessTrend(existing?.frequency ?? 0, frequency);
    await upsertWeakness({
      userId: input.userId,
      exerciseId: input.exerciseId,
      issueId: issue.id,
      source: "form",
      severity: issue.severity,
      trend,
      frequency,
      improvementPct: existing?.improvementPct ?? null,
      firstSeenAt: existing?.firstSeenAt ?? now,
      lastSeenAt: now,
    });
    updates.push({
      issueId: issue.id,
      source: "form",
      frequency,
      severity: issue.severity,
      trend,
      lastSeenAt: now,
      improvementPct: existing?.improvementPct ?? null,
    });
  }

  const compensationEvents = input.movementAnalysis?.compensation.events ?? [];
  const seen = new Set<string>();
  for (const ev of compensationEvents) {
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    const existing = await findWeakness(input.userId, input.exerciseId, ev.id);
    const frequency = (existing?.frequency ?? 0) + 1;
    const trend = classifyWeaknessTrend(existing?.frequency ?? 0, frequency);
    const severity = ev.confidence > 0.7 ? "major" : ev.confidence > 0.4 ? "moderate" : "minor";
    await upsertWeakness({
      userId: input.userId,
      exerciseId: input.exerciseId,
      issueId: ev.id,
      source: "movement",
      severity,
      trend,
      frequency,
      improvementPct: existing?.improvementPct ?? null,
      firstSeenAt: existing?.firstSeenAt ?? now,
      lastSeenAt: now,
    });
    updates.push({
      issueId: ev.id,
      source: "movement",
      frequency,
      severity,
      trend,
      lastSeenAt: now,
      improvementPct: existing?.improvementPct ?? null,
    });
  }

  return updates;
}
