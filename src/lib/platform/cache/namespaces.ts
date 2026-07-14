import type { CacheProvider } from "./types";
import { sharedMemoryCache } from "./memory-cache";

/** A prefixed, default-TTL view over a shared CacheProvider — keeps
 *  unrelated namespaces (session, exercise, AI Coach, personalization)
 *  from colliding on key names or fighting over one TTL policy, without
 *  needing a separate provider instance per namespace. */
class CacheNamespace {
  constructor(
    private prefix: string,
    private defaultTtlSeconds: number,
    private provider: CacheProvider,
  ) {}

  private key(key: string) {
    return `${this.prefix}:${key}`;
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.provider.get<T>(this.key(key));
  }

  set<T>(key: string, value: T, ttlSeconds = this.defaultTtlSeconds): Promise<void> {
    return this.provider.set(this.key(key), value, ttlSeconds);
  }

  del(key: string): Promise<void> {
    return this.provider.del(this.key(key));
  }

  clear(): Promise<void> {
    return this.provider.clear(this.prefix);
  }
}

export const sessionCache = new CacheNamespace("session", 60 * 30, sharedMemoryCache);
export const exerciseCache = new CacheNamespace("exercise", 60 * 60 * 24, sharedMemoryCache);
export const aiCoachCache = new CacheNamespace("ai-coach", 60 * 5, sharedMemoryCache);
export const personalizationCache = new CacheNamespace("personalization", 60 * 15, sharedMemoryCache);
