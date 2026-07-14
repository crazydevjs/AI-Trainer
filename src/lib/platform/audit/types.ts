export interface AuditEntry {
  id: string;
  action: string;
  actorId: string | null;
  targetId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  timestamp: number;
}
