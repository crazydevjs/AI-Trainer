import type { OnboardingInput } from "@/lib/validators";

const ACTIVITY_FACTOR: Record<OnboardingInput["activityLevel"], number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const GOAL_ADJUSTMENT: Record<OnboardingInput["goal"], number> = {
  LOSE_WEIGHT: -0.18,
  BUILD_MUSCLE: 0.12,
  GAIN_STRENGTH: 0.1,
  IMPROVE_ENDURANCE: 0,
  STAY_FIT: 0,
  RECOMP: -0.05,
};

export interface FitnessMetrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  dailyCalories: number;
  fitnessScore: number;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/** Mifflin-St Jeor BMR + activity/goal-adjusted maintenance calories. */
export function computeMetrics(input: OnboardingInput): FitnessMetrics {
  const heightM = input.heightCm / 100;
  const bmi = input.weightKg / (heightM * heightM);

  const base =
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  const bmr =
    input.gender === "MALE"
      ? base + 5
      : input.gender === "FEMALE"
        ? base - 161
        : base - 78; // average for "other"

  const tdee = bmr * ACTIVITY_FACTOR[input.activityLevel];
  const dailyCalories = Math.round(tdee * (1 + GOAL_ADJUSTMENT[input.goal]));

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory: bmiCategory(bmi),
    bmr: Math.round(bmr),
    dailyCalories,
    fitnessScore: computeFitnessScore(input, bmi),
  };
}

/** Heuristic 0-100 readiness score from profile signals. */
export function computeFitnessScore(
  input: OnboardingInput,
  bmi: number
): number {
  let score = 50;

  // BMI proximity to healthy midpoint (21.7)
  score += Math.max(0, 25 - Math.abs(bmi - 21.7) * 2.5);

  // Activity contribution
  const activityPts: Record<OnboardingInput["activityLevel"], number> = {
    SEDENTARY: 0,
    LIGHT: 4,
    MODERATE: 8,
    ACTIVE: 12,
    VERY_ACTIVE: 15,
  };
  score += activityPts[input.activityLevel];

  // Experience contribution
  const expPts: Record<OnboardingInput["experience"], number> = {
    BEGINNER: 0,
    INTERMEDIATE: 6,
    ADVANCED: 10,
  };
  score += expPts[input.experience];

  // Commitment (days/week)
  score += Math.min(10, input.workoutDays * 1.5);

  // Injuries reduce readiness
  score -= Math.min(12, input.injuries.length * 4);

  return Math.max(1, Math.min(100, Math.round(score)));
}

/** A simple weekly split tailored to days/week and goal. */
export interface PlanDayTemplate {
  dayOfWeek: number;
  focus: string;
  exerciseSlugs: string[];
}

export function generatePlan(input: OnboardingInput): {
  title: string;
  summary: string;
  days: PlanDayTemplate[];
} {
  const splits: Record<number, { focus: string; slugs: string[] }[]> = {
    3: [
      { focus: "Full Body A", slugs: ["squat", "bench-press", "pull-ups"] },
      { focus: "Full Body B", slugs: ["deadlift", "shoulder-press", "plank"] },
      { focus: "Full Body C", slugs: ["lunges", "push-ups", "bicep-curl"] },
    ],
    4: [
      { focus: "Push", slugs: ["bench-press", "shoulder-press", "tricep-pushdown"] },
      { focus: "Pull", slugs: ["deadlift", "pull-ups", "bicep-curl"] },
      { focus: "Legs", slugs: ["squat", "lunges", "plank"] },
      { focus: "Conditioning", slugs: ["cardio", "push-ups", "plank"] },
    ],
    5: [
      { focus: "Chest", slugs: ["bench-press", "push-ups"] },
      { focus: "Back", slugs: ["deadlift", "pull-ups"] },
      { focus: "Legs", slugs: ["squat", "lunges"] },
      { focus: "Shoulders & Arms", slugs: ["shoulder-press", "bicep-curl", "tricep-pushdown"] },
      { focus: "Core & Cardio", slugs: ["plank", "cardio"] },
    ],
  };

  const days = Math.min(5, Math.max(3, input.workoutDays));
  const template = splits[days] ?? splits[4];

  // Spread training days across the week (skip rest days).
  const stride = Math.floor(7 / template.length);
  const planDays: PlanDayTemplate[] = template.map((d, i) => ({
    dayOfWeek: (i * stride) % 7,
    focus: d.focus,
    exerciseSlugs: d.slugs,
  }));

  const goalLabel: Record<OnboardingInput["goal"], string> = {
    LOSE_WEIGHT: "Fat Loss",
    BUILD_MUSCLE: "Hypertrophy",
    GAIN_STRENGTH: "Strength",
    IMPROVE_ENDURANCE: "Endurance",
    STAY_FIT: "General Fitness",
    RECOMP: "Body Recomposition",
  };

  return {
    title: `${goalLabel[input.goal]} · ${days}-Day Split`,
    summary: `A ${days}-day program tuned for ${goalLabel[
      input.goal
    ].toLowerCase()} at your ${input.experience.toLowerCase()} level.`,
    days: planDays,
  };
}
