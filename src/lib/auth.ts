import "server-only";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signToken, verifyToken, type SessionPayload } from "@/lib/jwt";
import { SESSION_COOKIE, SESSION_MAX_AGE as MAX_AGE } from "@/lib/auth-constants";

export { SESSION_COOKIE };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Issue a session cookie for a user. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Read & verify the session from cookies (payload only — no DB hit).
 * `cache()` dedupes repeated calls within a single server request.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
});

/**
 * Full current user from DB (with profile). Null if unauthenticated.
 * Deduped per request so the layout + page share one query.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.sub) return null;
  return prisma.user.findUnique({
    where: { id: session.sub },
    include: { profile: true },
  });
});
