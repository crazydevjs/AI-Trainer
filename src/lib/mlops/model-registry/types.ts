/** Every independently-versionable piece of the AI stack. Nothing in this
 *  codebase carries a real semver today (engines are versioned by phase
 *  number in the docs, not in code) — this registry is where that starts
 *  being tracked going forward, seeded with 1.0.0 baselines. */
export type ComponentName =
  | "repEngine"
  | "formEngine"
  | "movementEngine"
  | "riskEngine"
  | "thresholds"
  | "exerciseCatalog"
  | "promptVersion"
  | "calibration"
  | "validation"
  | "release";

export const COMPONENT_NAMES: ComponentName[] = [
  "repEngine",
  "formEngine",
  "movementEngine",
  "riskEngine",
  "thresholds",
  "exerciseCatalog",
  "promptVersion",
  "calibration",
  "validation",
  "release",
];

export interface ComponentVersionRecord {
  component: ComponentName;
  version: string;
  updatedAt: number;
  updatedBy?: string;
  notes?: string;
}

export type ModelRegistrySnapshot = Record<ComponentName, ComponentVersionRecord>;
