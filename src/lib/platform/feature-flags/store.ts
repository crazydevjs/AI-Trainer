import { KNOWN_ENGINE_FLAGS, type FlagRule } from "./types";

/** In-memory rule store, seeded with sane defaults + an optional
 *  `FEATURE_FLAGS_JSON` env override (a JSON array of `FlagRule`) for
 *  environment-specific remote configuration without a redeploy. A real
 *  remote-config backend (LaunchDarkly, a DB table, etc.) can replace this
 *  file alone — every other file in this module only calls `getRule`/
 *  `setRule`/`listRules`. */
class FeatureFlagStore {
  private rules = new Map<string, FlagRule>();

  constructor() {
    for (const key of KNOWN_ENGINE_FLAGS) {
      this.rules.set(key, { key, enabled: true, rolloutPercentage: 100 });
    }
    this.seedFromEnv();
  }

  private seedFromEnv() {
    const raw = process.env.FEATURE_FLAGS_JSON;
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FlagRule[];
      for (const rule of parsed) this.rules.set(rule.key, rule);
    } catch {
      console.warn("[feature-flags] FEATURE_FLAGS_JSON is not valid JSON — ignoring");
    }
  }

  getRule(key: string): FlagRule | undefined {
    return this.rules.get(key);
  }

  setRule(rule: FlagRule): void {
    this.rules.set(rule.key, rule);
  }

  listRules(): FlagRule[] {
    return [...this.rules.values()];
  }
}

const globalForFlags = globalThis as unknown as { featureFlagStore?: FeatureFlagStore };

export const featureFlagStore = globalForFlags.featureFlagStore ?? new FeatureFlagStore();
if (process.env.NODE_ENV !== "production") globalForFlags.featureFlagStore = featureFlagStore;
