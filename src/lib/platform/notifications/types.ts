import type { NotificationType as PrismaNotificationType } from "@prisma/client";

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  /** Set when this notification kind has a matching Prisma
   *  `NotificationType` and should be persisted to the in-app
   *  `Notification` table; null for kinds the schema doesn't model yet
   *  (weekly summary, goal reached, coach message) — those are still
   *  delivered by email/log channels, just not persisted in-app until a
   *  follow-up migration extends the enum. */
  prismaType: PrismaNotificationType | null;
}

export interface NotificationChannel {
  name: string;
  send(payload: NotificationPayload): Promise<void>;
}
