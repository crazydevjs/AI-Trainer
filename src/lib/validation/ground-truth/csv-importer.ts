import { randomUUID } from "crypto";
import type { GroundTruthLabel } from "./types";

const COLUMNS = [
  "sessionId",
  "exerciseSlug",
  "trueRepCount",
  "trueRepTimestampsMs",
  "expectedRomPct",
  "expectedTempoSecPerRepMin",
  "expectedTempoSecPerRepMax",
  "expectedFormIssues",
  "notes",
  "labeledBy",
] as const;

/** Minimal quoted-field CSV line splitter — no external dependency,
 *  handles commas inside double-quoted fields (needed for free-text
 *  `notes`), nothing fancier (no embedded newlines within a field). */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/** Multi-value cells use `;` as the sub-separator (e.g.
 *  `"1200;3400;5600"` for rep timestamps, `"knee-valgus;forward-lean"`
 *  for expected form issues) — commas are reserved for column separation. */
function splitMulti(value: string): string[] {
  return value
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Columns (header row required, order-independent):
 *  sessionId, exerciseSlug, trueRepCount, trueRepTimestampsMs,
 *  expectedRomPct, expectedTempoSecPerRepMin, expectedTempoSecPerRepMax,
 *  expectedFormIssues, notes, labeledBy */
export function importGroundTruthCsv(raw: string): GroundTruthLabel[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const missing = COLUMNS.filter((c) => c === "sessionId" || c === "trueRepCount").filter(
    (required) => !header.includes(required),
  );
  if (missing.length > 0) {
    throw new Error(`Ground-truth CSV missing required column(s): ${missing.join(", ")}`);
  }

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((col, i) => (row[col] = cells[i] ?? ""));

    const label: GroundTruthLabel = {
      id: randomUUID(),
      sessionId: row.sessionId,
      exerciseSlug: row.exerciseSlug || undefined,
      trueRepCount: Number(row.trueRepCount) || 0,
      trueRepTimestampsMs: row.trueRepTimestampsMs ? splitMulti(row.trueRepTimestampsMs).map(Number) : undefined,
      expectedRomPct: row.expectedRomPct ? Number(row.expectedRomPct) : undefined,
      expectedTempoSecPerRep:
        row.expectedTempoSecPerRepMin && row.expectedTempoSecPerRepMax
          ? [Number(row.expectedTempoSecPerRepMin), Number(row.expectedTempoSecPerRepMax)]
          : undefined,
      expectedFormIssues: row.expectedFormIssues ? splitMulti(row.expectedFormIssues) : undefined,
      notes: row.notes || undefined,
      labeledBy: row.labeledBy || undefined,
      labeledAt: Date.now(),
    };
    return label;
  });
}
