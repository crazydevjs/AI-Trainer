import { SignJWT, jwtVerify } from "jose";
import { requireEnv, getEnv } from "@/lib/platform/security/secrets";

const secret = new TextEncoder().encode(
  process.env.NODE_ENV === "production"
    ? requireEnv("JWT_SECRET")
    : getEnv("JWT_SECRET", "dev-insecure-secret-change-me")
);

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: "USER" | "ADMIN";
  onboarded: boolean;
  tokenVersion: number;
}

/** Sign a session JWT (7-day expiry). Edge & Node compatible. */
export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** Verify a session JWT. Returns payload or null. */
export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
