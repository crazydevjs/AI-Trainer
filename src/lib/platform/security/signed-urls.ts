import { createHmac, timingSafeEqual } from "crypto";
import { getSigningSecret } from "./secrets";
import type { SignedPayload } from "./types";

function sign(data: string): string {
  return createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
}

/** Signs a JSON-serializable payload with an expiry, returning an opaque
 *  base64url token. Used by storage's getSignedUrl() and can be reused
 *  anywhere a tamper-proof, time-limited token is needed (no session/DB
 *  lookup required to verify it). */
export function signPayload<T>(payload: T, expirySeconds: number): string {
  const body: SignedPayload<T> = { payload, expiresAt: Date.now() + expirySeconds * 1000 };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySignedPayload<T>(token: string): T | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSig = Buffer.from(sign(encoded));
  const actualSig = Buffer.from(signature);
  if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
    return null;
  }

  try {
    const body = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SignedPayload<T>;
    if (Date.now() > body.expiresAt) return null;
    return body.payload;
  } catch {
    return null;
  }
}
