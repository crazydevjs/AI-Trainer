import { promises as fs } from "fs";
import path from "path";
import { signPayload } from "../security/signed-urls";
import { telemetry } from "../telemetry";
import type { StorageProvider } from "./types";

const ROOT = path.join(process.cwd(), ".data", "storage");

function resolveKeyPath(key: string): string {
  // Strip traversal segments before joining — keys are untrusted input
  // wherever this is called from an upload route.
  const safeKey = key.replace(/(^|[/\\])\.\.(?=[/\\]|$)/g, "");
  return path.join(ROOT, safeKey);
}

/** Local-disk storage provider — the default today since no cloud SDK is
 *  installed. Signed URLs point at `GET /api/storage/[...key]`, which
 *  verifies the token via `security/signed-urls.ts` before streaming the
 *  file back; nothing is served without a valid, unexpired token. */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  async put(key: string, data: Buffer | Uint8Array): Promise<void> {
    await telemetry.time("storage.put", async () => {
      const filePath = resolveKeyPath(key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, data);
    });
  }

  async get(key: string): Promise<Buffer | null> {
    return telemetry.time("storage.get", async () => {
      try {
        return await fs.readFile(resolveKeyPath(key));
      } catch {
        return null;
      }
    });
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(resolveKeyPath(key));
    } catch {
      // already gone — deleting a missing key isn't an error
    }
  }

  async getSignedUrl(key: string, expirySeconds: number): Promise<string> {
    const token = signPayload({ key }, expirySeconds);
    return `/api/storage/${key.split("/").map(encodeURIComponent).join("/")}?token=${token}`;
  }
}
