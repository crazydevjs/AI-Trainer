import "server-only";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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
 * Read & verify the session from cookies, then confirm the JWT's
 * `tokenVersion` still matches the DB — this is what makes password
 * changes / "log out everywhere" / account deletion actually revoke a
 * leaked or stale token instead of leaving it valid until natural expiry.
 * `cache()` dedupes repeated calls (including this one lightweight query)
 * within a single server request, so the cost is one indexed lookup, not
 * one per caller.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  const current = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { tokenVersion: true },
  });
  if (!current || current.tokenVersion !== payload.tokenVersion) return null;

  return payload;
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

/** Invalidate every outstanding session JWT for a user (password change,
 *  "log out everywhere", account deletion) by bumping the DB counter that
 *  `getSession()` checks against. Returns the new value in case a caller
 *  wants to re-issue a fresh session for the *current* device afterward. */
export async function bumpTokenVersion(userId: string): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
  return updated.tokenVersion;
}

/**
 * Guard for API routes that must only ever be called by an admin — the
 * internal platform/mlops/validation/observability status+control routes.
 * Usage: `const guard = await requireAdmin(); if ("error" in guard) return
 * guard.error;` — mirrors this project's existing inline `if (!session)
 * return NextResponse.json(...)` style rather than throwing, since Route
 * Handlers must return a Response either way.
 */
export async function requireAdmin(): Promise<
  { session: SessionPayload } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
