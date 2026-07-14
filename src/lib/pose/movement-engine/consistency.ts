// Rep-to-rep and early-vs-late-set consistency — computed once at session-
// summary time from the Form Engine's own sealed per-rep records
// (SessionFormSummary.reps), not per-frame. Form Engine already did the
// per-rep work; this file only compares reps against each other.

import type { RepFormSummary } from "../form-engine/types";
import { classifyTrend } from "./trend";
import type { ConsistencySummary } from "./types";

const TEMPO_THRESHOLD_MS = 400;

export function summarizeConsistency(reps: RepFormSummary[]): ConsistencySummary {
  if (reps.length < 2) {
    return {
      consistencyScore: 100,
      repToRepDrift: null,
      earlyVsLateDrift: null,
      techniqueDrift: "insufficient-data",
      romDrift: "insufficient-data",
      tempoDrift: "insufficient-data",
      stabilityDrift: "insufficient-data",
      notes: ["Not enough reps to assess consistency."],
    };
  }

  const overall = reps.map((r) => r.scores.overall);
  const technique = reps.map((r) => r.scores.technique);
  const rom = reps.map((r) => r.scores.rom);
  const stability = reps.map((r) => r.scores.stability);
  const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;

  let repDiffSum = 0;
  for (let i = 1; i < overall.length; i++) repDiffSum += Math.abs(overall[i] - overall[i - 1]);
  const repToRepDrift = Math.round((repDiffSum / (overall.length - 1)) * 10) / 10;

  const third = Math.max(1, Math.floor(overall.length / 3));
  const earlyVsLateDrift =
    Math.round((avg(overall.slice(-third)) - avg(overall.slice(0, third))) * 10) / 10;

  const tempos: number[] = [];
  for (let i = 1; i < reps.length; i++) tempos.push(reps[i].at - reps[i - 1].at);
  // Slower gaps late in the set read as fatigue (improvingIsHigher=false).
  const tempoDrift = tempos.length >= 4 ? classifyTrend(tempos, false, TEMPO_THRESHOLD_MS) : "insufficient-data";

  const techniqueDrift = classifyTrend(technique);
  const romDrift = classifyTrend(rom);
  const stabilityDrift = classifyTrend(stability);

  const notes: string[] = [];
  if (repToRepDrift > 12) notes.push("Form varied noticeably from rep to rep.");
  if (earlyVsLateDrift < -10) notes.push("Form declined from the start to the end of the set.");
  if (tempoDrift === "degrading") notes.push("Reps slowed down later in the set — possible fatigue.");
  if (romDrift === "degrading") notes.push("Range of motion decreased later in the set.");

  const consistencyScore = Math.max(
    0,
    Math.round(100 - repToRepDrift * 2 - Math.max(0, -earlyVsLateDrift))
  );

  return {
    consistencyScore,
    repToRepDrift,
    earlyVsLateDrift,
    techniqueDrift,
    romDrift,
    tempoDrift,
    stabilityDrift,
    notes,
  };
}
