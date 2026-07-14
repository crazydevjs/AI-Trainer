// Live coaching message selection. Cooldown-gated per issue id (mirrors
// coach.ts's repeat-avoidance idea, applied independently here) plus a short
// global cooldown so Form Engine cues don't compete with the Rep Engine's own
// rep-praise/correction cues for the same on-screen bubble.

import type { CoachMessage, DetectedIssue, Severity } from "./types";

const SEVERITY_RANK: Record<Severity, number> = { minor: 1, moderate: 2, major: 3, critical: 4 };
const PER_ISSUE_COOLDOWN_MS = 9000;
const GLOBAL_COOLDOWN_MS = 3500;

export function pickCoachingMessage(
  activeIssues: DetectedIssue[],
  lastSpokenAt: Record<string, number>,
  lastGlobalAt: number,
  now: number
): CoachMessage | null {
  if (now - lastGlobalAt < GLOBAL_COOLDOWN_MS) return null;
  if (!activeIssues.length) return null;

  const eligible = activeIssues.filter(
    (i) => i.severity !== "minor" && now - (lastSpokenAt[i.id] ?? 0) >= PER_ISSUE_COOLDOWN_MS
  );
  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    const rank = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    return rank !== 0 ? rank : b.confidence - a.confidence;
  });

  const top = eligible[0];
  const tone: CoachMessage["tone"] = top.severity === "critical" || top.severity === "major" ? "correct" : "info";
  return { text: top.correction, tone, issueId: top.id, priority: SEVERITY_RANK[top.severity] };
}
