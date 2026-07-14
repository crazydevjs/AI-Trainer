import type { RateLimitOptions, RateLimitResult } from "./types";

interface Bucket {
  count: number;
  resetAt: number;
}

/** Fixed-window in-memory rate limiter, keyed by an arbitrary string (a
 *  bucket name + an identifier such as an IP or user id). Correct for a
 *  single Node instance; a multi-instance deployment needs a shared store
 *  (Redis `INCR`+`EXPIRE`) behind this same `check()` signature — the
 *  call sites in the API routes don't need to change either way. */
class MemoryRateLimiter {
  private buckets = new Map<string, Bucket>();

  check(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + options.windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      this.sweep(now);
      return { allowed: true, remaining: options.max - 1, resetAt, limit: options.max };
    }

    if (existing.count >= options.max) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt, limit: options.max };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: options.max - existing.count,
      resetAt: existing.resetAt,
      limit: options.max,
    };
  }

  /** Opportunistic cleanup of expired buckets — avoids an unbounded Map
   *  without needing a separate timer. */
  private sweep(now: number) {
    if (this.buckets.size < 5000) return;
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
  }

  snapshot(): { activeBuckets: number } {
    return { activeBuckets: this.buckets.size };
  }
}

const globalForLimiter = globalThis as unknown as { memoryRateLimiter?: MemoryRateLimiter };

export const memoryRateLimiter = globalForLimiter.memoryRateLimiter ?? new MemoryRateLimiter();
if (process.env.NODE_ENV !== "production") globalForLimiter.memoryRateLimiter = memoryRateLimiter;
