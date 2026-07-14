import type { NotificationPayload } from "./types";

type Template = Omit<NotificationPayload, "userId">;

export function workoutReminderTemplate(exerciseName?: string): Template {
  return {
    title: "Time to train",
    body: exerciseName
      ? `Ready for ${exerciseName}? Your session is waiting.`
      : "Your workout is waiting — let's go.",
    prismaType: "WORKOUT_REMINDER",
  };
}

export function achievementUnlockedTemplate(achievementName: string): Template {
  return {
    title: "Achievement unlocked",
    body: `You just unlocked "${achievementName}".`,
    prismaType: "ACHIEVEMENT",
  };
}

export function weeklySummaryTemplate(sessionsCompleted: number): Template {
  return {
    title: "Your week in review",
    body: `You completed ${sessionsCompleted} session${sessionsCompleted === 1 ? "" : "s"} this week.`,
    prismaType: null,
  };
}

export function goalReachedTemplate(goal: string): Template {
  return { title: "Goal reached", body: `You hit your goal: ${goal}.`, prismaType: null };
}

export function coachMessageTemplate(text: string): Template {
  return { title: "Message from your coach", body: text, prismaType: null };
}
