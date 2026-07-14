// Developer-mode flags (hidden from normal users). All client-side localStorage.

import { useSyncExternalStore } from "react";

export type EngineOverride = "auto" | "2d" | "3d";

/** AI/build identifier stamped into exported debug logs. */
export const AI_BUILD = "forge-ai-1.1";

export interface SessionTags {
  exercise?: string;
  weight?: string;
  cameraAngle?: string;
  device?: string;
  lighting?: string;
  environment?: string;
  prAttempt?: boolean;
  failureSet?: boolean;
  notes?: string;
}

const DEV = "forge:dev";
const HUD = "forge:devhud";
const ENG = "forge:engine";
const STRICT = "forge:strictvalidation";
const FORM_ENGINE = "forge:formengine";
const MOVEMENT_ENGINE = "forge:movementengine";
const INJURY_RISK_ENGINE = "forge:injuryriskengine";
const EXERCISE_INTELLIGENCE = "forge:exerciseintelligence";

export function isDevUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return (
    process.env.NODE_ENV !== "production" ||
    window.localStorage.getItem(DEV) === "1"
  );
}

export function unlockDev() {
  if (typeof window !== "undefined") window.localStorage.setItem(DEV, "1");
}

function subscribeNoop() {
  return () => {};
}

/** Hydration-safe read of the dev-unlock flag for the Developer dashboard
 *  pages: `false` during SSR and the client's first paint (matching, since
 *  `localStorage` doesn't exist server-side), then the real value right
 *  after — via `useSyncExternalStore` rather than reading `localStorage`
 *  in a `useEffect` + `setState`, which trips the stricter
 *  react-hooks/set-state-in-effect rule. */
export function useDevUnlocked(): boolean {
  return useSyncExternalStore(subscribeNoop, isDevUnlocked, () => false);
}

export function getHudEnabled(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(HUD) === "1";
}
export function setHudEnabled(v: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(HUD, v ? "1" : "0");
}

export function getEngineOverride(): EngineOverride {
  if (typeof window === "undefined") return "auto";
  const v = window.localStorage.getItem(ENG);
  return v === "2d" || v === "3d" ? v : "auto";
}
export function setEngineOverride(v: EngineOverride) {
  if (typeof window !== "undefined") window.localStorage.setItem(ENG, v);
}

/** Off by default. When on, the rep engine also rejects reps that fail the
 *  tempo/stability checks (advisory-only otherwise) — see ALGORITHM.md. */
export function getStrictValidation(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(STRICT) === "1";
}
export function setStrictValidation(v: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(STRICT, v ? "1" : "0");
}

/** On by default. Runs the Form Analysis Engine alongside the rep engine —
 *  see src/lib/pose/form-engine/. Off switch for low-end devices. */
export function getFormEngineEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(FORM_ENGINE) !== "0";
}
export function setFormEngineEnabled(v: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(FORM_ENGINE, v ? "1" : "0");
}

/** On by default. Runs the Movement Intelligence Engine alongside the Form
 *  Engine — see src/lib/pose/movement-engine/. Off switch for low-end devices. */
export function getMovementEngineEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MOVEMENT_ENGINE) !== "0";
}
export function setMovementEngineEnabled(v: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(MOVEMENT_ENGINE, v ? "1" : "0");
}

/** On by default. Runs the Injury Risk Engine alongside the Movement
 *  Engine — see src/lib/pose/injury-risk-engine/. Off switch for low-end
 *  devices. */
export function getInjuryRiskEngineEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(INJURY_RISK_ENGINE) !== "0";
}
export function setInjuryRiskEngineEnabled(v: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(INJURY_RISK_ENGINE, v ? "1" : "0");
}

/** On by default. Shows exercise-specific biomechanics metadata (ROM,
 *  tempo, risk sensitivity, common mistakes) in the dev HUD — see
 *  src/lib/exercise-intelligence/. Metadata only, no scoring impact. */
export function getExerciseIntelligenceEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(EXERCISE_INTELLIGENCE) !== "0";
}
export function setExerciseIntelligenceEnabled(v: boolean) {
  if (typeof window !== "undefined") window.localStorage.setItem(EXERCISE_INTELLIGENCE, v ? "1" : "0");
}
