import { memoryRateLimiter } from "./memory-limiter";
import type { RateLimitOptions, RateLimitResult } from "./types";

export type { RateLimitOptions, RateLimitResult } from "./types";

/** Named presets for the surfaces called out in Phase 11 — Coach APIs,
 *  Authentication, Session APIs, Uploads, and future mobile APIs. Tuned
 *  conservatively; adjust once real traffic data exists, same "don't
 *  guess, validate against data" rule as every engine's thresholds. */
export const RATE_LIMIT_PRESETS: Record<string, RateLimitOptions> = {
  auth: { windowMs: 60_000, max: 10 },
  coach: { windowMs: 60_000, max: 30 },
  session: { windowMs: 60_000, max: 20 },
  upload: { windowMs: 60_000, max: 5 },
  mobileApi: { windowMs: 60_000, max: 60 },
};

/** `bucket` is a preset name from RATE_LIMIT_PRESETS (or any string, with
 *  explicit `options`); `identifier` is typically an IP address or user id. */
export function rateLimit(
  bucket: string,
  identifier: string,
  options: RateLimitOptions = RATE_LIMIT_PRESETS[bucket] ?? RATE_LIMIT_PRESETS.mobileApi,
): RateLimitResult {
  return memoryRateLimiter.check(`${bucket}:${identifier}`, options);
}

export function rateLimiterSnapshot() {
  return memoryRateLimiter.snapshot();
}
