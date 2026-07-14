/** A manually-authored label for one recorded session — the missing piece
 *  today's `dev-history.ts` `DevSession.actualReps` doesn't provide (that
 *  field is auto-populated from the engine's own count, not independently
 *  verified — see its "manual (needs video ground-truth)" comment on
 *  `falseReps`). This is the real thing: a human watches the recording and
 *  states what actually happened. */
export interface GroundTruthLabel {
  id: string;
  sessionId: string;
  exerciseSlug?: string;
  trueRepCount: number;
  /** Optional — enables real per-rep confusion-matrix matching instead of
   *  the coarser count-only approximation. Milliseconds, same clock base
   *  as the session log's `t` field. */
  trueRepTimestampsMs?: number[];
  expectedRomPct?: number;
  expectedTempoSecPerRep?: [number, number];
  /** Form Engine `IssueId` strings the reviewer observed, kept as `string`
   *  here (not importing `IssueId`) so a label file authored before a new
   *  issue id is added doesn't need this module to change. */
  expectedFormIssues?: string[];
  notes?: string;
  labeledBy?: string;
  labeledAt: number;
}
