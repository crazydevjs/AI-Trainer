/** Provider-agnostic object storage. S3, Cloudflare R2, and GCS all speak
 *  a broadly S3-compatible API, so one real implementation (once an SDK
 *  is installed) can likely serve all three with a different endpoint —
 *  no need for three separate providers. Not built in this phase (see
 *  Known limitations); `LocalStorageProvider` is the only implementation
 *  today. */
export interface StorageProvider {
  name: string;
  put(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expirySeconds: number): Promise<string>;
}
