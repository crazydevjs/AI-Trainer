import { randomUUID } from "crypto";
import { getCurrentVersions, setComponentVersion } from "../model-registry";
import { recordDeployment, recordRollback } from "../deployment-history";
import { saveRelease, getRelease } from "./store";
import type { ReleaseEvaluation } from "../evaluation-pipeline";
import type { RegressionSummary } from "../regression-detector";
import type { GateResult } from "../release-gates";
import type { ReleaseCandidate } from "./types";

export async function createReleaseCandidate(input: {
  name: string;
  datasetName: string;
  datasetVersion: number;
  createdBy?: string;
  notes?: string;
}): Promise<ReleaseCandidate> {
  const modelVersions = await getCurrentVersions();
  const release: ReleaseCandidate = {
    id: randomUUID(),
    name: input.name,
    modelVersions,
    datasetName: input.datasetName,
    datasetVersion: input.datasetVersion,
    createdAt: Date.now(),
    createdBy: input.createdBy,
    status: "candidate",
    notes: input.notes,
  };
  await saveRelease(release);
  return release;
}

async function requireRelease(releaseId: string): Promise<ReleaseCandidate> {
  const release = await getRelease(releaseId);
  if (!release) throw new Error(`Release "${releaseId}" not found`);
  return release;
}

export async function attachEvaluationResults(
  releaseId: string,
  results: { evaluation: ReleaseEvaluation; regressionSummary: RegressionSummary; gateResult: GateResult; qualityScore: number },
): Promise<ReleaseCandidate> {
  const release = await requireRelease(releaseId);
  const updated: ReleaseCandidate = { ...release, ...results };
  await saveRelease(updated);
  return updated;
}

export async function approveRelease(
  releaseId: string,
  options: { approvedBy?: string; force?: boolean } = {},
): Promise<ReleaseCandidate> {
  const release = await requireRelease(releaseId);
  if (!options.force && release.gateResult && !release.gateResult.passed) {
    throw new Error(`Release "${releaseId}" failed its release gates — pass \`force: true\` to override`);
  }
  const updated: ReleaseCandidate = { ...release, status: "approved", createdBy: release.createdBy ?? options.approvedBy };
  await saveRelease(updated);
  return updated;
}

export async function rejectRelease(releaseId: string, reason?: string): Promise<ReleaseCandidate> {
  const release = await requireRelease(releaseId);
  const updated: ReleaseCandidate = { ...release, status: "rejected", notes: reason ?? release.notes };
  await saveRelease(updated);
  return updated;
}

/** Deploying also bumps the model registry's `release` component to this
 *  release's name — the one component version that's meant to track
 *  "what's actually live," distinct from the release record itself. */
export async function deployRelease(releaseId: string, actor?: string, notes?: string): Promise<ReleaseCandidate> {
  const release = await requireRelease(releaseId);
  if (release.status !== "approved") {
    throw new Error(`Release "${releaseId}" must be approved before it can be deployed (status: ${release.status})`);
  }
  await recordDeployment(releaseId, actor, notes);
  await setComponentVersion("release", release.name, { updatedBy: actor, notes: `deployed release ${releaseId}` });

  const updated: ReleaseCandidate = { ...release, status: "deployed" };
  await saveRelease(updated);
  return updated;
}

export async function rollbackRelease(releaseId: string, actor?: string, notes?: string): Promise<ReleaseCandidate> {
  const release = await requireRelease(releaseId);
  await recordRollback(releaseId, actor, notes);

  const updated: ReleaseCandidate = { ...release, status: "approved" };
  await saveRelease(updated);
  return updated;
}
