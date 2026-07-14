import { eventBus } from "../events";
import { logger } from "../monitoring/logger";
import { InAppNotificationChannel } from "./in-app-channel";
import { EmailNotificationChannel } from "./email-channel";
import { achievementUnlockedTemplate, goalReachedTemplate, coachMessageTemplate } from "./templates";
import type { NotificationChannel, NotificationPayload } from "./types";

const channels: NotificationChannel[] = [new InAppNotificationChannel(), new EmailNotificationChannel()];

export async function dispatchNotification(
  template: Omit<NotificationPayload, "userId">,
  userId: string,
): Promise<void> {
  const payload: NotificationPayload = { ...template, userId };
  await Promise.all(
    channels.map((channel) =>
      channel.send(payload).catch((error) => {
        logger.error("notification channel failed", {
          channel: channel.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    ),
  );
}

/** Wires the notification dispatcher to the platform event bus, so any
 *  future publisher — an engine integration, a job, an API route — only
 *  needs to call `eventBus.publish(...)`; it never needs to know
 *  notifications exist. Idempotent-safe to call once at module load. */
function wireEventSubscriptions() {
  eventBus.subscribe("achievement.unlocked", ({ userId, achievementSlug }) => {
    void dispatchNotification(achievementUnlockedTemplate(achievementSlug), userId);
  });
  eventBus.subscribe("goal.reached", ({ userId, goal }) => {
    void dispatchNotification(goalReachedTemplate(goal), userId);
  });
  eventBus.subscribe("coach.message", ({ userId, text }) => {
    void dispatchNotification(coachMessageTemplate(text), userId);
  });
}

const globalForWiring = globalThis as unknown as { platformNotificationsWired?: boolean };
if (!globalForWiring.platformNotificationsWired) {
  wireEventSubscriptions();
  globalForWiring.platformNotificationsWired = true;
}
