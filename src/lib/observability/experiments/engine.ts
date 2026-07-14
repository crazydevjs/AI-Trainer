import { mean, stddev } from "@/lib/validation/statistics";
import { assignVariant, type ExperimentVariant } from "../ab-testing";
import {
  saveExperimentDefinition,
  updateExperimentDefinition,
  getExperimentDefinition,
  recordOutcome as storeOutcome,
  listOutcomes,
} from "./store";
import type { ExperimentDefinition, ExperimentResult } from "./types";

/** A variant needs at least this many recorded outcomes before it's
 *  eligible to win — a naive sample-size gate, not a real statistical
 *  power analysis (no significance test, no multiple-testing
 *  correction). First-pass, documented as such. */
const MIN_SAMPLE_SIZE = 30;

export async function createExperiment(input: {
  key: string;
  name: string;
  description: string;
  metricKey: string;
  variants: ExperimentVariant[];
}): Promise<ExperimentDefinition> {
  return saveExperimentDefinition(input);
}

export async function startExperiment(id: string): Promise<ExperimentDefinition> {
  const experiment = await getExperimentDefinition(id);
  if (!experiment) throw new Error(`Experiment "${id}" not found`);
  const updated: ExperimentDefinition = { ...experiment, status: "running", startedAt: Date.now() };
  await updateExperimentDefinition(updated);
  return updated;
}

export async function stopExperiment(id: string, winner: string | null = null): Promise<ExperimentDefinition> {
  const experiment = await getExperimentDefinition(id);
  if (!experiment) throw new Error(`Experiment "${id}" not found`);
  const updated: ExperimentDefinition = { ...experiment, status: "completed", endedAt: Date.now(), winner };
  await updateExperimentDefinition(updated);
  return updated;
}

/** Assigns (deterministically) and records in one call — the shape a
 *  live request handler would actually use. */
export async function assignAndRecord(experimentId: string, userId: string, metricValue: number): Promise<string> {
  const experiment = await getExperimentDefinition(experimentId);
  if (!experiment) throw new Error(`Experiment "${experimentId}" not found`);

  const variant = assignVariant(experiment.key, userId, experiment.variants);
  await storeOutcome({ experimentId, userId, variant, metricValue, recordedAt: Date.now() });
  return variant;
}

export async function computeExperimentResults(experimentId: string): Promise<ExperimentResult[]> {
  const outcomes = await listOutcomes(experimentId);
  const byVariant = new Map<string, number[]>();
  for (const outcome of outcomes) {
    const values = byVariant.get(outcome.variant) ?? [];
    values.push(outcome.metricValue);
    byVariant.set(outcome.variant, values);
  }

  return [...byVariant.entries()].map(([variant, values]) => ({
    variant,
    sampleSize: values.length,
    mean: mean(values),
    stddev: stddev(values),
  }));
}

/** Highest mean wins by default (`higherIsBetter`); pass `false` for a
 *  latency-style metric where lower is better. Returns `null` unless
 *  *every* variant has reached `MIN_SAMPLE_SIZE` — requiring only *some*
 *  variant to clear the bar would let a small-sample straggler get
 *  silently excluded and the remaining variant declared "the winner" by
 *  default, even if the excluded one actually had the better mean (caught
 *  during manual smoke-testing: a 21-sample "treatment" with a clearly
 *  higher mean got filtered out, leaving a 39-sample "control" to win by
 *  itself). "Not enough data" beats a premature, potentially wrong call. */
export async function selectWinner(experimentId: string, higherIsBetter = true): Promise<string | null> {
  const results = await computeExperimentResults(experimentId);
  if (results.length === 0 || results.some((r) => r.sampleSize < MIN_SAMPLE_SIZE)) return null;

  const sorted = [...results].sort((a, b) => (higherIsBetter ? b.mean - a.mean : a.mean - b.mean));
  return sorted[0].variant;
}
