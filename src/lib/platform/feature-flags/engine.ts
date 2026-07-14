import { featureFlagStore } from "./store";
import type { FlagContext } from "./types";

/** Deterministic 0-99 bucket for a (key,userId) pair — same user always
 *  lands in the same bucket for the same flag, so a percentage rollout
 *  doesn't flicker between requests. Not security-sensitive, so a fast
 *  non-cryptographic hash is intentional here (unlike security/signed-urls). */
function bucketOf(key: string, userId: string): number {
  let hash = 0;
  const input = `${key}:${userId}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100;
}

export function isEnabled(key: string, context: FlagContext = {}): boolean {
  const rule = featureFlagStore.getRule(key);
  if (!rule) return false;

  const userId = context.userId ?? "anonymous";
  if (rule.userOverrides?.includes(userId)) return true;
  if (!rule.enabled) return false;
  if (rule.rolloutPercentage == null || rule.rolloutPercentage >= 100) return true;
  if (rule.rolloutPercentage <= 0) return false;
  return bucketOf(key, userId) < rule.rolloutPercentage;
}
