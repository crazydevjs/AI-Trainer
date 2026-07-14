// Compensation detection — a small co-occurrence table over the Form
// Engine's already-detected `activeIssues`. When two specific issues are
// active at the same time, that combination plausibly indicates one region
// compensating for a limitation elsewhere. This describes observed movement
// *behavior*, not a medical diagnosis — see ALGORITHM.md "Scientific
// accuracy". No pose landmarks are read here, only Form Engine's issue ids.

import type { DetectedIssue, IssueId } from "../form-engine/types";
import type { CompensationEvent, CompensationId, CompensationSummary } from "./types";

interface CompensationRule {
  id: CompensationId;
  region: string;
  requires: [IssueId, IssueId];
  note: string;
}

const RULES: CompensationRule[] = [
  {
    id: "shoulderCompensation",
    region: "shoulder",
    requires: ["elbowFlare", "shoulderElevation"],
    note: "Shoulder may be compensating for limited elbow/arm mobility.",
  },
  {
    id: "hipCompensation",
    region: "hip",
    requires: ["kneeValgus", "hipShift"],
    note: "Hip may be compensating for knee misalignment.",
  },
  {
    id: "backCompensation",
    region: "back",
    requires: ["roundedBack", "forwardLean"],
    note: "Lower back may be compensating for hip/hamstring tightness.",
  },
  {
    id: "kneeCompensation",
    region: "knee",
    requires: ["heelLift", "kneeValgus"],
    note: "Knee tracking may be compensating for limited ankle mobility.",
  },
  {
    id: "neckCompensation",
    region: "neck",
    requires: ["headLookingDown", "neckMisalignment"],
    note: "Neck may be compensating for reduced upper-back mobility.",
  },
  {
    id: "ankleCompensation",
    region: "ankle",
    requires: ["heelLift", "toeLift"],
    note: "Ankle appears to be compensating with reduced foot contact.",
  },
  {
    id: "coreCompensation",
    region: "core",
    requires: ["overextendedBack", "weightShift"],
    note: "Core may be compensating for load control near lockout.",
  },
];

export interface CompensationMatch {
  id: CompensationId;
  region: string;
  triggerIssues: IssueId[];
  confidence: number;
  note: string;
}

/** Pure: which rules match the current frame's active issues. Caller
 *  (movement-engine/engine.ts) applies its own per-id cooldown before
 *  turning a match into a logged CompensationEvent. */
export function matchCompensations(activeIssues: DetectedIssue[]): CompensationMatch[] {
  const byId = new Map(activeIssues.map((i) => [i.id, i]));
  const out: CompensationMatch[] = [];
  for (const rule of RULES) {
    const [a, b] = rule.requires;
    const ia = byId.get(a);
    const ib = byId.get(b);
    if (!ia || !ib) continue;
    if (ia.severity === "minor" && ib.severity === "minor") continue;
    out.push({
      id: rule.id,
      region: rule.region,
      triggerIssues: [a, b],
      confidence: Math.round(((ia.confidence + ib.confidence) / 2) * 100) / 100,
      note: rule.note,
    });
  }
  return out;
}

export function summarizeCompensation(events: CompensationEvent[]): CompensationSummary {
  const regionCounts: CompensationSummary["regionCounts"] = {};
  for (const e of events) regionCounts[e.id] = (regionCounts[e.id] ?? 0) + 1;

  const ranked = Object.entries(regionCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const notes: string[] = [];
  if (ranked[0]) {
    const rule = RULES.find((r) => r.id === ranked[0][0]);
    if (rule) notes.push(`${rule.note} (observed ${ranked[0][1]}x this session)`);
  }

  return { events, regionCounts, notes };
}
