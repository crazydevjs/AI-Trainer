import { PassthroughCdnProvider } from "./passthrough-provider";
import type { CdnProvider } from "./types";

export type { CdnProvider } from "./types";
export { PassthroughCdnProvider } from "./passthrough-provider";

const globalForCdn = globalThis as unknown as { platformCdnProvider?: CdnProvider };

export function getCdnProvider(): CdnProvider {
  if (!globalForCdn.platformCdnProvider) {
    globalForCdn.platformCdnProvider = new PassthroughCdnProvider();
  }
  return globalForCdn.platformCdnProvider;
}
