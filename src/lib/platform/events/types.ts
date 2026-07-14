/** Typed platform event catalog. Adding a new event is adding one key here
 *  — every publisher/subscriber pair stays type-checked. */
export interface PlatformEventMap {
  "workout.started": { userId: string; exerciseId?: string | null };
  "workout.completed": { userId: string; exerciseId?: string | null; durationMs: number };
  "achievement.unlocked": { userId: string; achievementSlug: string };
  "goal.reached": { userId: string; goal: string };
  "subscription.changed": { userId: string; planId: string };
  "coach.message": { userId: string; text: string };
}

export type PlatformEventName = keyof PlatformEventMap;
