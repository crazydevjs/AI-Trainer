// Rolling within-session history the risk model reads from. Detects a
// completed rep purely from CoachState.reps incrementing — a public,
// already-exported field, not a rep-counter internal. No pose landmarks,
// no calls into any sealed engine's private state.

import type { CoachState } from "../rep-counter";
import type { FormAnalysisSnapshot } from "../form-engine/types";
import type { MovementAnalysisSnapshot } from "../movement-engine/types";

const CAP = 30;

function push(arr: number[], v: number, cap = CAP) {
  arr.push(v);
  if (arr.length > cap) arr.shift();
}

export class RiskHistory {
  private repScores: number[] = [];
  private repIntervalsMs: number[] = [];
  private peakVelocities: number[] = [];
  private issueOccurrences = new Map<string, number>();
  private compensationOccurrences = new Map<string, number>();
  private seenIssueStarts = new Set<string>();
  private seenCompensationKeys = new Set<string>();

  private lastReps = 0;
  private lastRepAt: number | null = null;
  private curPeakVelocity = 0;
  private startedAt: number | null = null;

  update(
    input: {
      coachState: CoachState;
      formSnapshot: FormAnalysisSnapshot;
      movementSnapshot: MovementAnalysisSnapshot | null;
    },
    now: number
  ) {
    if (this.startedAt == null) this.startedAt = now;

    if (input.movementSnapshot?.velocity != null) {
      this.curPeakVelocity = Math.max(this.curPeakVelocity, Math.abs(input.movementSnapshot.velocity));
    }

    if (input.coachState.reps > this.lastReps) {
      this.lastReps = input.coachState.reps;
      if (this.lastRepAt != null) push(this.repIntervalsMs, now - this.lastRepAt);
      this.lastRepAt = now;

      const parts = [input.formSnapshot.scores.overall, input.movementSnapshot?.scores.overall].filter(
        (n): n is number => n != null
      );
      if (parts.length) push(this.repScores, parts.reduce((a, b) => a + b, 0) / parts.length);

      push(this.peakVelocities, this.curPeakVelocity);
      this.curPeakVelocity = 0;
    }

    for (const issue of input.formSnapshot.activeIssues) {
      if (issue.status !== "started") continue;
      const key = `${issue.id}:${issue.firstSeenAt}`;
      if (this.seenIssueStarts.has(key)) continue;
      this.seenIssueStarts.add(key);
      this.issueOccurrences.set(issue.id, (this.issueOccurrences.get(issue.id) ?? 0) + 1);
    }

    if (input.movementSnapshot) {
      for (const ev of input.movementSnapshot.activeCompensations) {
        const key = `${ev.id}:${ev.at}`;
        if (this.seenCompensationKeys.has(key)) continue;
        this.seenCompensationKeys.add(key);
        this.compensationOccurrences.set(ev.id, (this.compensationOccurrences.get(ev.id) ?? 0) + 1);
      }
    }
  }

  get repCount(): number {
    return this.repScores.length;
  }

  elapsedSec(now: number): number {
    return this.startedAt != null ? (now - this.startedAt) / 1000 : 0;
  }

  getRepScores(): number[] {
    return this.repScores;
  }

  getRepIntervalsMs(): number[] {
    return this.repIntervalsMs;
  }

  getPeakVelocities(): number[] {
    return this.peakVelocities;
  }

  getIssueOccurrences(): Map<string, number> {
    return this.issueOccurrences;
  }

  getCompensationOccurrences(): Map<string, number> {
    return this.compensationOccurrences;
  }
}
