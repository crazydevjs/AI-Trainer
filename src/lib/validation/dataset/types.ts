import type { ExerciseConfig } from "@/lib/pose/exercises";
import type { SessionFormSummary } from "@/lib/pose/form-engine/types";
import type { SessionMovementSummary } from "@/lib/pose/movement-engine/types";
import type { SessionRiskSummary } from "@/lib/pose/injury-risk-engine/types";

/** One entry in the per-frame/per-event debug log — mirrors exactly what
 *  `use-pose-trainer.ts`'s `logEvent()` pushes (`event: "rep"`,
 *  `"rep-rejected"`, `"sample"`, `"fallback-3d-to-2d"`, `"tracking-loss"`,
 *  `"tracking-regained"`). Kept as an open record rather than a closed
 *  union — this framework only ever reads known fields defensively and
 *  must not break if a future field is added to the live log. */
export type SessionLogEntry = Record<string, unknown> & { event: string; t?: number };

/** Mirrors the shape of `session-report.tsx`'s `exportDebug()` JSON —
 *  this is what a developer already downloads from a live session today.
 *  A `LabeledSession` is exactly one of those exports, loaded from disk. */
export interface LabeledSession {
  meta: {
    sessionId: string;
    exercise: string;
    exerciseSlug: string;
    poseKey: string | null;
    timestamp: string;
    aiBuild: string;
    [key: string]: unknown;
  };
  tuning: {
    exerciseConfig: ExerciseConfig;
    [key: string]: unknown;
  };
  summary: {
    durationSec: number;
    repsCounted?: number;
    repsRejected?: number;
    totalReps: number;
    invalidReps: number;
    formScore: number;
    romScore: number;
    stabilityScore: number;
    [key: string]: unknown;
  };
  sets: unknown[];
  log: SessionLogEntry[];
  formAnalysis: SessionFormSummary | null;
  movementAnalysis: SessionMovementSummary | null;
  injuryRiskAnalysis: SessionRiskSummary | null;
  [key: string]: unknown;
}

export interface DatasetEntry {
  id: string;
  session: LabeledSession;
  groundTruthId: string | null;
  addedAt: number;
}

export interface DatasetManifest {
  name: string;
  version: number;
  createdAt: number;
  entryCount: number;
  labeledCount: number;
  exercises: string[];
}

export interface Dataset {
  manifest: DatasetManifest;
  entries: DatasetEntry[];
}
