export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(prefix?: string): Promise<void>;
}

export interface CacheStats {
  provider: string;
  entries: number;
  hits: number;
  misses: number;
}
