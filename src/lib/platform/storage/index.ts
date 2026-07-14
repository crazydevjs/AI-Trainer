import { LocalStorageProvider } from "./local-provider";
import type { StorageProvider } from "./types";

export type { StorageProvider } from "./types";
export { LocalStorageProvider } from "./local-provider";

const globalForStorage = globalThis as unknown as { platformStorageProvider?: StorageProvider };

/** Returns the active storage provider. Local disk today; set
 *  `STORAGE_PROVIDER` and construct an S3/R2/GCS-backed implementation at
 *  this one call site once a cloud SDK is added as a dependency. */
export function getStorageProvider(): StorageProvider {
  if (!globalForStorage.platformStorageProvider) {
    globalForStorage.platformStorageProvider = new LocalStorageProvider();
  }
  return globalForStorage.platformStorageProvider;
}
