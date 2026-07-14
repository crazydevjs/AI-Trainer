import { prisma } from "@/lib/prisma";
import type { NotificationChannel, NotificationPayload } from "./types";

/** Persists to the existing (previously unused) Prisma `Notification`
 *  model — no schema change needed for the notification kinds it already
 *  models (WORKOUT_REMINDER, ACHIEVEMENT, MOTIVATION, RECOVERY,
 *  WATER_REMINDER). */
export class InAppNotificationChannel implements NotificationChannel {
  readonly name = "in-app";

  async send(payload: NotificationPayload): Promise<void> {
    if (!payload.prismaType) return;
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.prismaType,
        title: payload.title,
        body: payload.body,
      },
    });
  }
}
