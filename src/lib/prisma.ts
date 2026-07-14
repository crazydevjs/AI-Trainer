import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Neon's `-pooler` endpoint runs PgBouncer in transaction-pooling mode,
 *  which doesn't preserve session-level state (e.g. prepared statements)
 *  across a Prisma request the way a direct connection does — Prisma's
 *  own docs call for `pgbouncer=true` on the connection string whenever
 *  a pooled endpoint is used, to disable the prepared-statement caching
 *  that assumes a stable session. Without it, rapid successive
 *  writes-then-reads (exactly what Playwright's E2E flows do) can hit
 *  spurious "record not found" errors for rows that were just committed
 *  moments earlier — reproduced and root-caused while building Phase 24's
 *  E2E suite. Appended here (not hand-edited into every .env) so it
 *  applies wherever a pooled URL is used, without duplicating the secret. */
function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("pgbouncer=")) return url;
  if (!url.includes("-pooler.")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
