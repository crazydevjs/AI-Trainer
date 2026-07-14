import { SignJWT, jwtVerify } from "jose";
import { getSigningSecret } from "@/lib/platform/security/secrets";

/** Short-lived, signed payload carrying a verified Google identity that's
 *  pending confirmation against an existing password account. Avoids
 *  auto-linking Google sign-ins to existing accounts (an account-takeover
 *  vector) while not requiring a full extra Prisma table for a 5-minute-TTL
 *  value. Never persisted — the user's own password is the real check. */
export interface GoogleLinkPayload {
  userId: string;
  googleId: string;
  name: string;
  image?: string;
}

function secret() {
  return new TextEncoder().encode(getSigningSecret());
}

export async function signGoogleLinkToken(payload: GoogleLinkPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret());
}

export async function verifyGoogleLinkToken(token: string): Promise<GoogleLinkPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as GoogleLinkPayload;
  } catch {
    return null;
  }
}
