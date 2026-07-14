import type { CdnProvider } from "./types";

/** Default CDN provider: resolves to `NEXT_PUBLIC_CDN_URL + path` if that
 *  env var is set, otherwise returns the path unchanged (origin serves it
 *  directly). This alone is enough to point static assets at a real CDN
 *  by setting one env var — no code change needed for that basic case;
 *  `purge()` is a no-op until a real CDN provider (with a purge API) is
 *  wired in behind the same interface. */
export class PassthroughCdnProvider implements CdnProvider {
  readonly name = "passthrough";

  resolve(path: string): string {
    const base = process.env.NEXT_PUBLIC_CDN_URL;
    if (!base) return path;
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  }

  async purge(): Promise<void> {
    // No-op: nothing to invalidate without a real CDN provider behind this.
  }
}
