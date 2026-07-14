import { z } from "zod";
import { randomUUID } from "crypto";
import type { GroundTruthLabel } from "./types";

const labelSchema = z.object({
  sessionId: z.string().min(1),
  exerciseSlug: z.string().optional(),
  trueRepCount: z.number().int().min(0),
  trueRepTimestampsMs: z.array(z.number()).optional(),
  expectedRomPct: z.number().min(0).max(200).optional(),
  expectedTempoSecPerRep: z.tuple([z.number(), z.number()]).optional(),
  expectedFormIssues: z.array(z.string()).optional(),
  notes: z.string().optional(),
  labeledBy: z.string().optional(),
});

const fileSchema = z.array(labelSchema);

/** Parses a JSON array of ground-truth labels. Throws with a readable
 *  message on malformed input rather than silently producing garbage
 *  labels — a bad import here would corrupt every downstream metric. */
export function importGroundTruthJson(raw: string): GroundTruthLabel[] {
  const parsed = fileSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`Invalid ground-truth JSON: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
  }
  return parsed.data.map((entry) => ({
    id: randomUUID(),
    labeledAt: Date.now(),
    ...entry,
  }));
}
