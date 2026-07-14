import { randomUUID } from "crypto";
import { logger } from "../monitoring/logger";
import type { AuditEntry } from "./types";

const MAX_ENTRIES = 1000;

/** Security/compliance-relevant event log — auth, subscription changes,
 *  API key lifecycle, admin actions. Every entry is also written through
 *  the structured logger (so it reaches a real log pipeline today) and
 *  kept in an in-memory ring buffer for the Developer dashboard. A
 *  persistent, queryable store (a Prisma `AuditLog` table) is a natural
 *  follow-up migration — deliberately not added in this phase, see
 *  ALGORITHM.md "Known limitations". */
class AuditLog {
  private entries: AuditEntry[] = [];

  record(input: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
    const entry: AuditEntry = { ...input, id: randomUUID(), timestamp: Date.now() };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
    logger.info("audit", { action: entry.action, actorId: entry.actorId, targetId: entry.targetId });
    return entry;
  }

  list(limit = 50): AuditEntry[] {
    return this.entries.slice(-limit).reverse();
  }
}

const globalForAudit = globalThis as unknown as { platformAuditLog?: AuditLog };

export const auditLog = globalForAudit.platformAuditLog ?? new AuditLog();
if (process.env.NODE_ENV !== "production") globalForAudit.platformAuditLog = auditLog;
