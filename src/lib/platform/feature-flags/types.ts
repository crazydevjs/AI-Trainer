export interface FlagContext {
  userId?: string | null;
  environment?: string;
}

export interface FlagRule {
  key: string;
  enabled: boolean;
  /** 0-100. If set, the flag is only active for this percentage of users,
   *  chosen deterministically by hashing the user id — the same user
   *  always gets the same answer for a given key. */
  rolloutPercentage?: number;
  /** User ids always enabled regardless of rollout percentage — used for
   *  beta testers / internal accounts. */
  userOverrides?: string[];
  description?: string;
}

/** Flags the AI engines already respect client-side via `src/lib/dev.ts`
 *  (`forge:formengine` etc.) — mirrored here as the server-side/remote-
 *  config counterpart so a future admin surface or A/B test can control
 *  the same toggles without shipping a client build. This module does not
 *  read or write `dev.ts`'s localStorage keys; the two are independent
 *  layers by design (client override vs. remote default). */
export const KNOWN_ENGINE_FLAGS = [
  "engine.formEngine",
  "engine.movementEngine",
  "engine.injuryRiskEngine",
  "engine.exerciseIntelligence",
  "engine.personalizationEngine",
] as const;
