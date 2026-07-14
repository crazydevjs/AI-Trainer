import type { CacheProvider, CacheStats } from "./types";

interface Entry {
  value: unknown;
  expiresAt: number;
}

/** Default cache provider: an in-memory Map with lazy TTL expiry. Correct
 *  for a single Node instance / dev; a multi-instance deployment should
 *  inject a `RedisCacheProvider` (see redis-cache.ts) implementing the
 *  same `CacheProvider` interface — no call site needs to change. */
export class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, Entry>();
  private hits = 0;
  private misses = 0;

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  async clear(prefix?: string): Promise<void> {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  stats(): CacheStats {
    return { provider: "memory", entries: this.store.size, hits: this.hits, misses: this.misses };
  }
}

const globalForCache = globalThis as unknown as { memoryCacheProvider?: MemoryCacheProvider };

export const sharedMemoryCache = globalForCache.memoryCacheProvider ?? new MemoryCacheProvider();
if (process.env.NODE_ENV !== "production") globalForCache.memoryCacheProvider = sharedMemoryCache;
