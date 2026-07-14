import { sharedMemoryCache } from "./memory-cache";

export type { CacheProvider, CacheStats } from "./types";
export { MemoryCacheProvider, sharedMemoryCache } from "./memory-cache";
export { RedisCacheProvider, type RedisLikeClient } from "./redis-cache";
export { sessionCache, exerciseCache, aiCoachCache, personalizationCache } from "./namespaces";

/** Returns the active cache provider. Memory today; set `CACHE_PROVIDER`
 *  to a future value once a real backend is wired at this call site. */
export function getCacheProvider() {
  return sharedMemoryCache;
}

export function cacheStats() {
  return sharedMemoryCache.stats();
}
