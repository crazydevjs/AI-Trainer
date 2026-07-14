import type { CacheProvider } from "./types";

/** The minimal subset of a Redis client this provider needs — deliberately
 *  not `import Redis from "ioredis"`, since no Redis client is installed
 *  in this project yet. When one is added (e.g. `ioredis`), construct it
 *  at the call site and pass it in here; this file never depends on the
 *  package directly, so adding Redis support is a dependency + a few
 *  lines at the wiring point (see cache/index.ts), not a rewrite. */
export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
}

export class RedisCacheProvider implements CacheProvider {
  constructor(private client: RedisLikeClient) {}

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(key);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  async clear(prefix?: string): Promise<void> {
    const keys = await this.client.keys(`${prefix ?? ""}*`);
    await Promise.all(keys.map((key) => this.client.del(key)));
  }
}
