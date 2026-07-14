import { randomBytes, createHash, timingSafeEqual } from "crypto";

const PREFIX = "forge_sk_";

/** Generates a new API key. Returns the plaintext key (show once to the
 *  caller) and its hash (the only form that should ever be persisted). */
export function generateApiKey(): { key: string; hash: string } {
  const key = PREFIX + randomBytes(24).toString("hex");
  return { key, hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function verifyApiKey(key: string, hash: string): boolean {
  const candidate = Buffer.from(hashApiKey(key));
  const expected = Buffer.from(hash);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
