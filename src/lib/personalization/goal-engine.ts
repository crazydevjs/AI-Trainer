// GoalProfile CRUD + goal-to-focus-dimension mapping. The mapping is
// informational only (surfaced via getGoalProfile()'s focusDimensions) —
// it never alters any Performance Engine score, it just tells a future
// consumer which of Phase 7's 8 score dimensions matter most for this
// user's stated goal.

import type { FitnessGoal, TrainingGoal } from "@prisma/client";
import { getGoalProfileRow, getOnboardingProfile, upsertGoalProfileRow } from "./personalization-store";
import type { GoalProfileResult } from "./types";

// Distinct from the existing onboarding FitnessGoal enum — see
// ALGORITHM.md "Naming collisions, resolved". Used only to seed a
// sensible default the first time a user has no explicit GoalProfile.
const ONBOARDING_GOAL_MAP: Record<FitnessGoal, TrainingGoal> = {
  LOSE_WEIGHT: "FAT_LOSS",
  BUILD_MUSCLE: "HYPERTROPHY",
  GAIN_STRENGTH: "STRENGTH",
  IMPROVE_ENDURANCE: "ENDURANCE",
  STAY_FIT: "GENERAL_FITNESS",
  RECOMP: "GENERAL_FITNESS",
};

const FOCUS_DIMENSIONS: Record<TrainingGoal, string[]> = {
  STRENGTH: ["strengthScore", "techniqueScore"],
  HYPERTROPHY: ["volumeScore", "consistencyScore"],
  FAT_LOSS: ["volumeScore", "consistencyScore"],
  ENDURANCE: ["consistencyScore", "recoveryScore"],
  GENERAL_FITNESS: ["overallScore", "consistencyScore"],
  REHABILITATION: ["techniqueScore", "recoveryScore"],
};

export async function getGoalProfile(userId: string): Promise<GoalProfileResult> {
  const row = await getGoalProfileRow(userId);
  if (row) {
    return {
      goal: row.goal,
      targetFrequency: row.targetFrequency,
      notes: row.notes,
      focusDimensions: FOCUS_DIMENSIONS[row.goal],
    };
  }
  const onboarding = await getOnboardingProfile(userId);
  const goal = onboarding ? ONBOARDING_GOAL_MAP[onboarding.goal] : "GENERAL_FITNESS";
  return { goal, targetFrequency: null, notes: null, focusDimensions: FOCUS_DIMENSIONS[goal] };
}

export async function setGoalProfile(
  userId: string,
  goal: TrainingGoal,
  targetFrequency?: number,
  notes?: string
): Promise<GoalProfileResult> {
  const row = await upsertGoalProfileRow(userId, goal, targetFrequency, notes);
  return {
    goal: row.goal,
    targetFrequency: row.targetFrequency,
    notes: row.notes,
    focusDimensions: FOCUS_DIMENSIONS[row.goal],
  };
}
