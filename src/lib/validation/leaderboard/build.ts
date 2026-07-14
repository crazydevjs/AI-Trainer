import type { Experiment } from "../experiment";
import type { LeaderboardEntry } from "./types";

/** Ranks past experiments by their "after" F1 — the after-the-fact
 *  candidate metrics an experiment recorded — highest first per pose key,
 *  so "what's the best calibration we've tried for this exercise" is a
 *  one-line answer instead of re-reading every experiment file. */
export function buildLeaderboard(experiments: Experiment[]): LeaderboardEntry[] {
  return experiments
    .map((e) => ({
      experimentId: e.id,
      name: e.name,
      poseKey: e.poseKey ?? null,
      date: e.date,
      precision: e.metricsAfter.precision ?? 0,
      recall: e.metricsAfter.recall ?? 0,
      f1: e.metricsAfter.f1 ?? 0,
      winner: e.winner,
      regressionDetected: e.regressionDetected,
    }))
    .sort((a, b) => b.f1 - a.f1);
}
